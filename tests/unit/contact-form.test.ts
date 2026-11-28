import assert from "node:assert/strict";
import { test } from "node:test";
import { sendContactMessage } from "../../src/utils/contact-form.ts";

function contactFormData() {
  const formData = new FormData();
  formData.set("access_key", "test-public-key");
  formData.set("name", "Jane Doe");
  formData.set("email", "jane@example.com");
  formData.set("message", "Hello");
  return formData;
}

test("sends contact form fields to Web3Forms and accepts successful responses", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(input), "https://api.web3forms.com/submit");
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers && new Headers(init.headers).get("Accept"), "application/json");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      access_key: "test-public-key",
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Hello",
    });
    return Response.json({ success: true, message: "Submission successful" });
  });

  await sendContactMessage(contactFormData());
});

test("reports Web3Forms errors instead of treating failed submissions as successful", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify({ success: false, message: "Invalid access key" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
  );

  await assert.rejects(sendContactMessage(contactFormData()), /Invalid access key/);
});

test("rejects a missing access key without making a request", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch should not be called");
  });
  const formData = contactFormData();
  formData.set("access_key", "");

  await assert.rejects(sendContactMessage(formData), /Missing Web3Forms access key/);
});

test("propagates network failures from Web3Forms", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Network unavailable");
  });

  await assert.rejects(sendContactMessage(contactFormData()), /Network unavailable/);
});
