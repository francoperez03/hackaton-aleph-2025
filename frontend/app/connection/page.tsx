"use client";

import { useState, useEffect, useCallback } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import { ServiceRequest, vpnService, VpnService } from "@/services/vpn-service";
import { PaymentStatus, VpnStatus } from "@/types";
import { requestService } from "@/services/vpn-service-transactions";
import { useRouter } from "next/navigation";
import NodeRSA from "encrypt-rsa";
import {
  SERVICE_PROVIDER_ABI,
  SERVICE_PROVIDER_ADDRESS,
} from "@/constants/service-provider";
import { Button } from "@/components/ui/button";

const nodeRSA = new NodeRSA();

export default function Connection() {
  const router = useRouter();
  const [recommendationsCount, setRecommendationsCount] = useState(0);
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(
    null
  );

  const onBuy = useCallback(async () => {
    const user = MiniKit.user?.walletAddress;
    if (!user) {
      return;
    }

    const { publicKey, privateKey } = nodeRSA.createPrivateAndPublicKeys();
    localStorage.setItem("publicKey", publicKey);
    localStorage.setItem("privateKey", privateKey);

    await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: SERVICE_PROVIDER_ADDRESS,
          abi: SERVICE_PROVIDER_ABI,
          functionName: "requestService",
          args: ["1", Buffer.from(publicKey).toString("base64")],
        },
      ],
    });

    while (true) {
      const serviceRequest = await vpnService.getServiceRequestForUser(user);

      if (
        serviceRequest.fulfilled &&
        serviceRequest.expiresAt > Date.now() / 1000
      ) {
        setServiceRequest(serviceRequest);
      }

      console.log("waiting for request fulfill...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }, []);

  useEffect(() => {
    const fetchVpnStatus = async () => {
      let address = MiniKit.user?.walletAddress;
      if (!address) {
        address = "0xc6351af7e9a0b6341bf9682488839cb0021f1fda";
      }

      try {
        const service = await vpnService.getServiceRequestForUser(address);
        const count = await vpnService.getRecommendationsCount(address);

        setRecommendationsCount(Number(count));
        setServiceRequest(service);
      } catch (err) {
        console.error("Error fetching VPN status:", err);
      }
    };

    fetchVpnStatus();
  }, []);

  if (recommendationsCount < 1) {
    return "You don't have anough recommendations";
  }

  if (
    serviceRequest?.fulfilled &&
    serviceRequest.expiresAt > Date.now() / 1000
  ) {
    const decrypted = nodeRSA.decryptStringWithRsaPrivateKey({
      text: serviceRequest.encryptedConnectionDetails,
      privateKey: localStorage.getItem("privateKey") as string,
    });

    return "You have an active connection: " + decrypted;
  }

  return (
    <div>
      <Button onClick={onBuy}>Buy</Button>
    </div>
  );
}
