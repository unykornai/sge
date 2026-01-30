// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AffiliatePayout
 * @notice Simple affiliate payout contract supporting on-chain instant payouts in ERC20 tokens.
 * - A designated `relayer` (backend) or allowed caller triggers payouts when a paying user completes a purchase.
 * - Prevents duplicate payouts for the same (child, referrer) pair.
 * - Supports USDC-only, SGE-only, or hybrid payouts via token transfers.
 * - Owner can withdraw tokens and set configuration.
 */
contract AffiliatePayout is Ownable {
    // relayer is the only address allowed to call payout functions (usually backend or SGEID contract)
    address public relayer;

    // track paid referrals: keccak256(abi.encodePacked(child, referrer)) => paid
    mapping(bytes32 => bool) public referralPaid;

    event RelayerUpdated(address indexed relayer);
    event AffiliatePaid(address indexed referrer, address indexed child, uint256 usdcAmount, uint256 sgeAmount, address usdcToken, address sgeToken);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

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
     * @dev Pay an affiliate in a single ERC20 token (USDC or other stablecoin).
     * @param child The referred user's wallet
     * @param referrer The affiliate wallet to pay
     * @param usdcAmount Amount of `usdcToken` to send (in token decimals)
     * @param usdcToken Token contract address for payments
     */
    function payAffiliateUSDC(address child, address referrer, uint256 usdcAmount, address usdcToken) external onlyRelayer {
        require(referrer != address(0), "invalid referrer");
        require(child != address(0), "invalid child");
        require(referrer != child, "self-referral not allowed");

        bytes32 key = _key(child, referrer);
        require(!referralPaid[key], "referral already paid");

        // mark paid before external call
        referralPaid[key] = true;

        if (usdcAmount > 0) {
            bool ok = IERC20(usdcToken).transfer(referrer, usdcAmount);
            require(ok, "USDC transfer failed");
        }

        emit AffiliatePaid(referrer, child, usdcAmount, 0, usdcToken, address(0));
    }

    /**
     * @dev Pay affiliate with hybrid tokens: USDC + SGE (ERC20). Both transfers happen in a single call.
     */
    function payAffiliateHybrid(address child, address referrer, uint256 usdcAmount, address usdcToken, uint256 sgeAmount, address sgeToken) external onlyRelayer {
        require(referrer != address(0), "invalid referrer");
        require(child != address(0), "invalid child");
        require(referrer != child, "self-referral not allowed");

        bytes32 key = _key(child, referrer);
        require(!referralPaid[key], "referral already paid");

        referralPaid[key] = true;

        if (usdcAmount > 0) {
            bool ok1 = IERC20(usdcToken).transfer(referrer, usdcAmount);
            require(ok1, "USDC transfer failed");
        }

        if (sgeAmount > 0) {
            bool ok2 = IERC20(sgeToken).transfer(referrer, sgeAmount);
            require(ok2, "SGE transfer failed");
        }

        emit AffiliatePaid(referrer, child, usdcAmount, sgeAmount, usdcToken, sgeToken);
    }

    /**
     * @dev Admin emergency withdrawal for tokens accidentally left in contract.
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "invalid recipient");
        bool ok = IERC20(token).transfer(to, amount);
        require(ok, "withdraw failed");
        emit EmergencyWithdraw(token, to, amount);
    }

    function _key(address child, address referrer) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(child, referrer));
    }
}
