# SGE-ID Contracts

Hardhat project for the SGE-ID NFT contract.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your mainnet RPC URL and deployer private key
```

## Compile

```bash
npm run compile
```

## Deploy to Mainnet

```bash
npm run deploy:mainnet
```

**CRITICAL**: The deployer wallet will become the owner of the SGEID contract. Use the same private key in the API's `RELAYER_PRIVATE_KEY` for gasless minting.

## After Deployment

1. Copy the `SGEID_ADDRESS` printed by the deploy script
2. Add it to `packages/api/.env`
3. Verify the contract owner matches your API relayer wallet

## Contract: SGEID.sol

- **Standard**: ERC721 (OpenZeppelin)
- **Functions**:
  - `mintTo(address to)` - Owner-only gasless mint
  - `setBaseURI(string)` - Set metadata base URI
  - `totalSupply()` - Get total minted count

## Security Notes

- Only the contract owner can mint new tokens
- Owner must be the API relayer for gasless minting to work
- Deployment is blocked if not on Ethereum mainnet (chainId 1)
