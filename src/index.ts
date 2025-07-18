export default {
  async fetch(request) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    const PROXY_ENDPOINT = "/corsproxy";

    async function handleRequest(request) {
      const url = new URL(request.url);
      let apiUrl;

      const pathAfterProxy = url.pathname.slice(PROXY_ENDPOINT.length);

      if (pathAfterProxy.startsWith("/http")) {
        // Normal case: /corsproxy/https://...
        apiUrl = pathAfterProxy.slice(1); // Remove the initial slash
      } else if (url.search.startsWith("?http")) {
        // Special case: /corsproxy?https://...
        apiUrl = url.search.slice(1); // Remove the ?
      }

      if (!apiUrl) {
        return new Response(
          JSON.stringify({
            error: "Missing target URL. Put it after /corsproxy/ or as ?https://...",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const newRequest = new Request(apiUrl, request);
      newRequest.headers.set("Origin", new URL(apiUrl).origin);

      let response = await fetch(newRequest);
      response = new Response(response.body, response);

      // Set CORS headers for the response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      response.headers.append("Vary", "Origin");

      return response;
    }

    async function handleOptions(request) {
      if (
        request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null
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

    if (
      url.pathname === PROXY_ENDPOINT ||
      url.pathname.startsWith(PROXY_ENDPOINT + "/")
    ) {
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
