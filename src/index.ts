export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    const PROXY_ENDPOINT = "/corsproxy/";

    async function handleRequest(request) {
      const url = new URL(request.url);

      // Essayer de récupérer l'URL cible soit dans apiurl, soit dans le chemin
      let apiUrl = url.searchParams.get("apiurl");
      const pathAfterProxy = url.pathname.slice(PROXY_ENDPOINT.length);

      if (!apiUrl && pathAfterProxy.startsWith("http")) {
        apiUrl = pathAfterProxy;
      }

      if (!apiUrl) {
        return new Response(
          JSON.stringify({
            error:
              "Missing target URL. Provide 'apiurl' query parameter or put the target URL after /corsproxy/",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Recréer la requête vers l'API cible
      const newRequest = new Request(apiUrl, request);
      newRequest.headers.set("Origin", new URL(apiUrl).origin);

      // Faire la requête
      let response = await fetch(newRequest);

      // Ajouter les headers CORS
      response = new Response(response.body, response);
      response.headers.set("Access-Control-Allow-Origin", url.origin);
      response.headers.append("Vary", "Origin");

      return response;
    }

    async function handleOptions(request) {
      if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null
      ) {
        return new Response(null, {
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Headers": request.headers.get(
              "Access-Control-Request-Headers"
            ),
          },
        });
      } else {
        return new Response(null, {
          headers: { Allow: "GET, HEAD, POST, OPTIONS" },
        });
      }
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith(PROXY_ENDPOINT)) {
      if (request.method === "OPTIONS") {
        return handleOptions(request);
      } else if (["GET", "HEAD", "POST"].includes(request.method)) {
        return handleRequest(request);
      } else {
        return new Response(null, {
          status: 405,
          statusText: "Method Not Allowed",
        });
      }
    } else {
      return new Response("Not found", { status: 404 });
    }
  },
};
