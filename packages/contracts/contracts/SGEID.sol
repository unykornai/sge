// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SGEID
 * @dev SGE Identity NFT - gasless minting for registered users
 */
contract SGEID is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    string private _baseTokenURI;

    event Minted(address indexed to, uint256 indexed tokenId);

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mint a new SGE-ID NFT to the specified address
     * @param to The address that will receive the NFT
     * @return tokenId The ID of the newly minted token
     */
    function mintTo(address to) external onlyOwner returns (uint256 tokenId) {
        require(to != address(0), "Cannot mint to zero address");
        
        _tokenIdCounter += 1;
        tokenId = _tokenIdCounter;
        
        _safeMint(to, tokenId);
        
        emit Minted(to, tokenId);
        return tokenId;
    }

    /**
     * @dev Set the base URI for token metadata
     * @param newBase The new base URI (should end with /)
     */
    function setBaseURI(string memory newBase) external onlyOwner {
        _baseTokenURI = newBase;
    }

    /**
     * @dev Base URI for computing tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev Get the current token counter (total minted)
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
