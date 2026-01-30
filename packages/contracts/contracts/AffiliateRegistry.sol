// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AffiliateRegistry
 * @notice Records simple parent (referrer) -> child relationships on-chain.
 * - Designed to be called by the relayer or minting service when a new user mints SGE-ID with a `?ref=` param.
 * - Prevents self-referral and duplicate registration.
 */
contract AffiliateRegistry is Ownable {
    // relayer address allowed to register referrals
    address public relayer;

    // child => referrer
    mapping(address => address) public referrerOf;

    event RelayerUpdated(address indexed relayer);
    event ReferralRegistered(address indexed child, address indexed referrer);

    modifier onlyRelayer() {
        require(msg.sender == relayer, "caller is not relayer");
        _;
    }

    constructor(address _relayer) Ownable(msg.sender) {
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    /**
     * @dev Register a referral relationship. Can only be called by `relayer`.
     * @param child The referred user's wallet
     * @param referrer The affiliate wallet
     */
    function registerReferral(address child, address referrer) external onlyRelayer {
        require(child != address(0) && referrer != address(0), "invalid addresses");
        require(child != referrer, "self-referral not allowed");
        require(referrerOf[child] == address(0), "child already registered");

        referrerOf[child] = referrer;
        emit ReferralRegistered(child, referrer);
    }

    /**
     * @dev Helper to lookup referrer for a child
     */
    function getReferrer(address child) external view returns (address) {
        return referrerOf[child];
    }
}
