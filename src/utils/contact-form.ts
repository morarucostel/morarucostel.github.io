const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

interface Web3FormsResponse {
  success?: unknown;
  message?: unknown;
}

function isWeb3FormsResponse(value: unknown): value is Web3FormsResponse {
  return typeof value === "object" && value !== null;
}

export async function sendContactMessage(formData: FormData): Promise<void> {
  const accessKey = formData.get("access_key");
  if (typeof accessKey !== "string" || !accessKey.trim()) {
    throw new Error("Missing Web3Forms access key.");
  }

  const response = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(Object.fromEntries(formData.entries())),
  });
  const result: unknown = await response.json();

  if (!response.ok || !isWeb3FormsResponse(result) || result.success !== true) {
    const message =
      isWeb3FormsResponse(result) && typeof result.message === "string"
        ? result.message
        : `Web3Forms returned HTTP ${response.status}.`;
    throw new Error(message);
  }
}
