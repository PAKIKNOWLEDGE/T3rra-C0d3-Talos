// Offline acceptance preview. Ordinary launcher does not use this file.
globalThis.fetch = async (input) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.href === "https://registry.npmjs.org/%40pakiknowledge%2Ftal0s-code/latest") {
    return new Response(JSON.stringify({ name: "@pakiknowledge/tal0s-code", version: "0.5.8" }), { status: 200 });
  }
  if (url.href === "https://models.dev/api.json") {
    return new Response(JSON.stringify({ error: "Offline acceptance preview" }), { status: 503 });
  }
  throw new Error("Offline update preview: other network requests are disabled");
};
