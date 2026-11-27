import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.Executors;

public class Main {
  private static final Path ROOT = Path.of("web").toAbsolutePath().normalize();
  private static final Map<String,String> TYPES = Map.of(
    "html", "text/html; charset=UTF-8",
    "css", "text/css; charset=UTF-8",
    "js", "application/javascript; charset=UTF-8",
    "png", "image/png",
    "jpg", "image/jpeg",
    "webp", "image/webp",
    "svg", "image/svg+xml",
    "json", "application/json; charset=UTF-8"
  );
  public static void main(String[] args) throws Exception {
    int port;
    try { port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080")); }
    catch(NumberFormatException e){ port = 8080; }
    HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
    server.createContext("/", Main::handle);
    server.setExecutor(Executors.newFixedThreadPool(8));
    server.start();
    System.out.println("UTMACH Orienta listo en http://localhost:" + port);
  }
  private static void handle(HttpExchange ex) throws IOException {
    String method = ex.getRequestMethod();
    String path=ex.getRequestURI().getPath();
    if(path.startsWith("/api/admin/")){admin(ex,path);return;}
    if(path.equals("/api/telemetry")){if(!authorized(ex)){reply(ex,403,"text/plain",new byte[0]);return;} if(method.equals("POST")&&!sameOrigin(ex)){reply(ex,403,"text/plain",new byte[0]);return;} telemetry(ex); return;}
    if(path.equals("/proyecto.html")){ex.getResponseHeaders().set("Location","/#nosotros");reply(ex,302,"text/plain",new byte[0]);return;}
    if(!method.equals("GET") && !method.equals("HEAD")) {
      reply(ex,405,"text/plain; charset=UTF-8","Método no admitido".getBytes(StandardCharsets.UTF_8)); return;
    }
    String req = ex.getRequestURI().getPath();
    if(req.equals("/api/lan")) { reply(ex,200,"application/json; charset=UTF-8",("{\"ip\":\""+lanIp()+"\"}").getBytes(StandardCharsets.UTF_8)); return; }
    if(req.equals("/health")) { reply(ex,200,"text/plain; charset=UTF-8","ok".getBytes(StandardCharsets.UTF_8)); return; }
    String requested = req.equals("/") ? "index.html" : req.substring(1);
    Path file = ROOT.resolve(requested).normalize();
    if(!file.startsWith(ROOT) || !Files.isRegularFile(file)) {
      reply(ex,404,"text/plain; charset=UTF-8","No encontrado".getBytes(StandardCharsets.UTF_8)); return;
    }
    String name=file.getFileName().toString();
    String ext=name.contains(".")?name.substring(name.lastIndexOf('.')+1).toLowerCase():"";
    if(ext.equals("mp4")){serveVideo(ex,file);return;}
    byte[] b=Files.readAllBytes(file);
    ex.getResponseHeaders().set("Cache-Control","no-cache, max-age=0");
    ex.getResponseHeaders().set("X-Content-Type-Options","nosniff");
    reply(ex,200,TYPES.getOrDefault(ext,"application/octet-stream"),b);
  }
  // MP4: streaming por rangos para navegadores móviles, sin cargar el video entero en RAM.
  private static void serveVideo(HttpExchange ex,Path file)throws IOException{
    long size=Files.size(file),start=0,end=size-1;int status=200;
    var headers=ex.getResponseHeaders();headers.set("Content-Type","video/mp4");headers.set("Accept-Ranges","bytes");headers.set("Cache-Control","no-cache, max-age=0");headers.set("X-Content-Type-Options","nosniff");
    if(ex.getRequestMethod().equals("HEAD")){headers.set("Content-Length",Long.toString(size));ex.sendResponseHeaders(200,-1);ex.close();return;}
    String range=ex.getRequestHeaders().getFirst("Range");
    if(range!=null){try{
      var match=java.util.regex.Pattern.compile("bytes=([0-9]*)-([0-9]*)").matcher(range);
      if(!match.matches()||size==0)throw new IllegalArgumentException();
      String a=match.group(1),b=match.group(2);
      if(a.isEmpty()){long suffix=Long.parseLong(b);if(suffix<=0)throw new IllegalArgumentException();start=Math.max(0,size-suffix);}
      else{start=Long.parseLong(a);if(!b.isEmpty())end=Math.min(end,Long.parseLong(b));}
      if(start>=size||end<start)throw new IllegalArgumentException();status=206;
      headers.set("Content-Range","bytes "+start+"-"+end+"/"+size);
    }catch(IllegalArgumentException e){headers.set("Content-Range","bytes */"+size);ex.sendResponseHeaders(416,-1);ex.close();return;}}
    long length=end-start+1;headers.set("Content-Length",Long.toString(length));
    if(length==0){ex.sendResponseHeaders(status,-1);ex.close();return;}
    ex.sendResponseHeaders(status,length);
    try(var input=new java.io.RandomAccessFile(file.toFile(),"r");var output=ex.getResponseBody()){
      input.seek(start);byte[] buffer=new byte[65536];long remaining=length;
      while(remaining>0){int n=input.read(buffer,0,(int)Math.min(buffer.length,remaining));if(n<0)break;output.write(buffer,0,n);remaining-=n;}
    }finally{ex.close();}
  }
  private static final java.util.concurrent.ConcurrentHashMap<String,Long> sessions=new java.util.concurrent.ConcurrentHashMap<>();
  private static final java.security.SecureRandom random=new java.security.SecureRandom();
  private static String sessionId(HttpExchange ex){String c=ex.getRequestHeaders().getFirst("Cookie");if(c!=null)for(String part:c.split(";")){String v=part.trim();if(v.startsWith("orienta_session="))return v.substring(16);}return "";}
  private static boolean authorized(HttpExchange ex){Long expiry=sessions.get(sessionId(ex));return expiry!=null&&expiry>System.currentTimeMillis();}
  private static boolean sameOrigin(HttpExchange ex){String o=ex.getRequestHeaders().getFirst("Origin"),h=ex.getRequestHeaders().getFirst("Host");return o!=null&&(o.equals("https://"+h)||o.equals("http://"+h));}
  private static boolean secure(HttpExchange ex){String h=ex.getRequestHeaders().getFirst("Host");return h==null||!(h.matches("localhost(:[0-9]+)?")||h.matches("127\\.0\\.0\\.1(:[0-9]+)?"));}
  private static long windowStart=0;private static int attempts=0;
  private static synchronized boolean permit(){long now=System.currentTimeMillis();if(now-windowStart>60000){windowStart=now;attempts=0;}return ++attempts<=20;}
  private static void admin(HttpExchange ex,String path)throws IOException{
    ex.getResponseHeaders().set("Cache-Control","no-store");String method=ex.getRequestMethod();
    if(path.equals("/api/admin/session")&&method.equals("GET")){reply(ex,authorized(ex)?200:401,"text/plain",new byte[0]);return;}
    if(!method.equals("POST")||!sameOrigin(ex)){reply(ex,403,"text/plain",new byte[0]);return;}
    String flags="; Path=/; HttpOnly; SameSite=Strict"+(secure(ex)?"; Secure":"");
    if(path.equals("/api/admin/logout")){sessions.remove(sessionId(ex));ex.getResponseHeaders().set("Set-Cookie","orienta_session=; Max-Age=0"+flags);reply(ex,200,"text/plain",new byte[0]);return;}
    if(!path.equals("/api/admin/login")){reply(ex,404,"text/plain",new byte[0]);return;}
    String password=System.getenv().getOrDefault("ADMIN_PASSWORD",""),user=System.getenv().getOrDefault("ADMIN_USER","admin");
    if(password.length()<12){reply(ex,503,"text/plain",new byte[0]);return;}
    if(!permit()){reply(ex,429,"text/plain",new byte[0]);return;}
    byte[] raw=ex.getRequestBody().readNBytes(4097);if(raw.length>4096){reply(ex,400,"text/plain",new byte[0]);return;}
    Map<String,String> form=new java.util.HashMap<>();try{for(String pair:new String(raw,StandardCharsets.UTF_8).split("&")){String[] kv=pair.split("=",2);if(kv.length==2)form.put(java.net.URLDecoder.decode(kv[0],StandardCharsets.UTF_8),java.net.URLDecoder.decode(kv[1],StandardCharsets.UTF_8));}}catch(IllegalArgumentException e){reply(ex,400,"text/plain",new byte[0]);return;}
    if(!user.equals(form.get("user"))||!java.security.MessageDigest.isEqual(password.getBytes(StandardCharsets.UTF_8),form.getOrDefault("password","").getBytes(StandardCharsets.UTF_8))){reply(ex,401,"text/plain",new byte[0]);return;}
    sessions.remove(sessionId(ex));long now=System.currentTimeMillis();sessions.entrySet().removeIf(e->e.getValue()<now);byte[] bytes=new byte[32];random.nextBytes(bytes);String id=java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);sessions.put(id,now+28800000L);ex.getResponseHeaders().set("Set-Cookie","orienta_session="+id+"; Max-Age=28800"+flags);reply(ex,200,"text/plain",new byte[0]);
  }
  private static final java.util.regex.Pattern FRAME = java.util.regex.Pattern.compile("^STATE:(IDLE|ROUTE|DONE|ERROR)\\|([^|]{0,23})\\|([01]{7})\\|([01]{2})\\|([^|]{16})\\|([^|]{16})$");
  private static final java.util.ArrayDeque<String> HISTORY = new java.util.ArrayDeque<>();
  private static String current = "null";
  private static long receivedAt = 0;
  private static String lastFrame = "";
  private static long lastHistory = 0;
  private static String quote(String s){return "\""+s.replace("\\","\\\\").replace("\"","\\\"")+"\"";}
  private static synchronized void telemetry(HttpExchange ex) throws IOException {
    ex.getResponseHeaders().set("Cache-Control","no-store");
    String method=ex.getRequestMethod();
    if(method.equals("POST")){
      String frame=new String(ex.getRequestBody().readNBytes(256),StandardCharsets.US_ASCII);
      var m=FRAME.matcher(frame);
      if(!m.matches() || frame.chars().anyMatch(c->c<32||c>126)){reply(ex,400,"text/plain",new byte[0]);return;}
      long now=System.currentTimeMillis();receivedAt=now;
      current="{\"time\":"+quote(java.time.Instant.ofEpochMilli(now).toString())+",\"state\":"+quote(m.group(1))+",\"dest\":"+quote(m.group(2))+",\"led\":"+quote(m.group(3))+",\"buzz\":"+quote(m.group(4))+",\"lcd\":["+quote(m.group(5))+","+quote(m.group(6))+"],\"line\":"+quote(frame)+"}";
      if(!frame.equals(lastFrame)||now-lastHistory>=5000){HISTORY.addFirst(current);while(HISTORY.size()>100)HISTORY.removeLast();lastFrame=frame;lastHistory=now;}
      reply(ex,200,"text/plain", "ok".getBytes(StandardCharsets.UTF_8));return;
    }
    if(!method.equals("GET")){reply(ex,405,"text/plain",new byte[0]);return;}
    String json="{\"live\":"+(receivedAt>0&&System.currentTimeMillis()-receivedAt<4500)+",\"current\":"+current+",\"history\":["+String.join(",",HISTORY)+"]}";
    reply(ex,200,"application/json; charset=UTF-8",json.getBytes(StandardCharsets.UTF_8));
  }
  // IP de la laptop en la red local (para que el QR funcione desde el celular estando en localhost)
  private static String lanIp(){
    try{
      String fallback="";
      var en=java.net.NetworkInterface.getNetworkInterfaces();
      while(en!=null && en.hasMoreElements()){
        var ni=en.nextElement();
        if(!ni.isUp()||ni.isLoopback()) continue;
        String n=ni.getDisplayName().toLowerCase();
        boolean virt=ni.isVirtual()||n.contains("virtual")||n.contains("vmware")||n.contains("vbox")||n.contains("hyper-v")||n.contains("wsl")||n.contains("docker");
        for(var a:java.util.Collections.list(ni.getInetAddresses())){
          if(a instanceof java.net.Inet4Address && a.isSiteLocalAddress()){ if(virt) fallback=a.getHostAddress(); else return a.getHostAddress(); }
        }
      }
      return fallback;
    }catch(Exception e){ return ""; }
  }
  private static void reply(HttpExchange ex,int code,String type,byte[] bytes)throws IOException{
    ex.getResponseHeaders().set("Content-Type",type);
    if(ex.getRequestMethod().equals("HEAD")) {
      ex.sendResponseHeaders(code,-1);
    } else {
      ex.sendResponseHeaders(code,bytes.length);
      try(var out=ex.getResponseBody()){out.write(bytes);}
    }
    ex.close();
  }
}
