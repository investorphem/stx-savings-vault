import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
  window.global = window;
  window.process = {
    env: { DEBUG: undefined },
    version: "",
    nextTick: (cb) => setTimeout(cb, 0),
  };
}
