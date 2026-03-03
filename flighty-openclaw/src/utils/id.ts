import crypto from "node:crypto";

export const uid = () => crypto.randomUUID();

export const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");
