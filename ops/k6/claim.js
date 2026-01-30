import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    burst: { 
      executor: "ramping-vus", 
      startVUs: 0, 
      stages: [
        { duration: "30s", target: 500 }, 
        { duration: "30s", target: 0 }
      ] 
    }
  }
};

export default function () {
  const wallet = `0x${__VU.toString().padStart(40, "0")}`;
  const key = `claim-${wallet}-${__ITER}`;
  
  const payload = JSON.stringify({ wallet, amount: "100" });
  const params = {
    headers: { 
      "Content-Type": "application/json", 
      "Idempotency-Key": key 
    }
  };

  const res = http.post("http://localhost:3000/api/claim/prepare", payload, params);

  check(res, { 
    "claim prepare 200": (r) => r.status === 200,
    "has transactions": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.transactions !== undefined;
      } catch {
        return false;
      }
    }
  });
}
