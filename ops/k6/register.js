import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    burst: { 
      executor: "ramping-vus", 
      startVUs: 0, 
      stages: [
        { duration: "30s", target: 1000 }, 
        { duration: "30s", target: 0 }
      ] 
    }
  }
};

export default function () {
  const wallet = `0x${__VU.toString().padStart(40, "0")}`;
  const key = `idem-${wallet}`;
  
  const payload = JSON.stringify({ wallet });
  const params = {
    headers: { 
      "Content-Type": "application/json", 
      "Idempotency-Key": key 
    }
  };

  // First request
  const res1 = http.post("http://localhost:3000/api/register", payload, params);
  
  // Second request (should hit idempotency cache)
  const res2 = http.post("http://localhost:3000/api/register", payload, params);

  check(res1, { 
    "register 200/201": (r) => r.status < 300 
  });
  
  check(res2, { 
    "idempotent hit": (r) => r.headers["X-Idempotency"] === "HIT" || r.status < 300 
  });
}
