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
    byte[] b=Files.readAllBytes(file);
    ex.getResponseHeaders().set("Cache-Control","no-cache, max-age=0");
    ex.getResponseHeaders().set("X-Content-Type-Options","nosniff");
    reply(ex,200,TYPES.getOrDefault(ext,"application/octet-stream"),b);
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
