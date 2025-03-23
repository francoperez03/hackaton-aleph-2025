import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  RPC_PROVIDER,
  VpnStatus,
} from "@/types";
import { Contract, JsonRpcProvider } from "ethers";

export interface ServiceRequest {
  id: bigint;
  user: string;
  serviceId: bigint;
  encryptionKey: string;
  encryptedConnectionDetails: string;
  timestamp: bigint;
  fulfilled: boolean;
  expiresAt: bigint;
}

export class VpnService {
  private contract: Contract;

  constructor(provider: JsonRpcProvider = new JsonRpcProvider(RPC_PROVIDER)) {
    this.contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }

  async getServiceRequestForUser(user: string): Promise<ServiceRequest> {
    try {
      const rawRequest = await this.contract.getServiceRequestForUser(user);
      console.log("ABC", await this.contract.getServiceRequestForUser("0xf6868Dff09cd83e0bdE34D720643c708b41d5bFB"))
      console.log("getServiceRequestForUser", {rawRequest})
      const [
        id,
        _user,
        requestServiceId,
        encryptionKey,
        encryptedConnectionDetails,
        timestamp,
        fulfilled,
        expiresAt,
      ] = rawRequest;

      const serviceRequest: ServiceRequest = {
        id,
        user,
        serviceId: requestServiceId,
        encryptionKey,
        encryptedConnectionDetails,
        timestamp,
        fulfilled,
        expiresAt,
      };
      return serviceRequest;
    } catch (err) {
      console.error("Error fetching VPN status:", err);
      throw err;
    }
  }

  async getRecommendationsCount(userAddress: string): Promise<bigint> {
    const recommendationCount = await this.contract.recommendationsCount(
      userAddress
    );
    return recommendationCount;
  }

  async getVpnStatus(
    userAddress: string,
    serviceId: bigint
  ): Promise<VpnStatus> {
    try {
      const recommendationCount = await this.contract.recommendationsCount(
        userAddress
      );
      alert(`recomendationCount ${recommendationCount}`);
      if (recommendationCount === 0n) {
        return "missing-recommendations";
      } else if (recommendationCount >= 1n) {
        const rawRequest = await this.contract.getServiceRequestForUser(
          userAddress
        );
        const [
          id,
          user,
          requestServiceId,
          encryptionKey,
          encryptedConnectionDetails,
          timestamp,
          fulfilled,
          expiresAt,
        ] = rawRequest;

        const serviceRequest: ServiceRequest = {
          id,
          user,
          serviceId: requestServiceId,
          encryptionKey,
          encryptedConnectionDetails,
          timestamp,
          fulfilled,
          expiresAt,
        };
        const currentTimestampInSeconds = BigInt(Math.floor(Date.now() / 1000));
        if (currentTimestampInSeconds > serviceRequest.expiresAt) {
          return "active";
        }
        return "expired";
      }
    } catch (err) {
      console.error("Error fetching VPN status:", err);
    }
    return "checking";
  }
}

export const vpnService = new VpnService();
