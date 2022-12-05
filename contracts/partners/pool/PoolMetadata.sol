// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title .pool domain metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for the .pool TLD
contract PoolMetadata is Ownable {
  string public description;

  // EVENTS
  event DescriptionChanged(address indexed user, string description);

  // READ
  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns(string memory) {
    string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));

    return string(
      abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(abi.encodePacked(
        '{"name": "', fullDomainName, '", ',
        '"description": "', description, '", ',
        '"image": "', _getImage(fullDomainName), '"}'))))
    );
  }

  function _getImage(string memory _fullDomainName) internal pure returns (string memory) {
    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(
      '<svg width="500" height="500" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">',
        '<defs><linearGradient id="paint0_linear" x1="159" y1="0" x2="159" y2="318" gradientUnits="userSpaceOnUse">',
        '<stop stop-color="#7E46F2"/><stop offset="1" stop-color="#46279A"/></linearGradient></defs>',
        '<rect width="500" height="500" fill="url(#paint0_linear)"/>',
        '<text x="50%" y="65%" dominant-baseline="middle" fill="white" text-anchor="middle" font-size="x-large" font-family="sans-serif">',
        _fullDomainName,'</text>',
        '<path transform="translate(90, 0)" d="M165.033 61.6631C195.443 61.6631 220.096 86.7273 220.096 117.645V149.835C220.096 180.754 195.443 205.818 165.033 205.818C160.256 205.818 155.621 205.199 151.202 204.037L151.203 207.837C151.203 230.455 133.081 248.833 110.588 249.199L109.905 249.204V126.043L109.968 126.041L109.97 117.645C109.97 86.7273 134.623 61.6631 165.033 61.6631ZM165.033 103.65C157.43 103.65 151.267 109.916 151.267 117.645V149.835C151.267 157.565 157.43 163.831 165.033 163.831C172.636 163.831 178.799 157.565 178.799 149.835V117.645C178.799 109.916 172.636 103.65 165.033 103.65Z" fill="white"/>',
      '</svg>'
    ))));

    return string(abi.encodePacked("data:image/svg+xml;base64,", svgBase64Encoded));
  }

  // WRITE (OWNER)

  /// @notice Only metadata contract owner can call this function.
  function changeDescription(string calldata _description) external onlyOwner {
    description = _description;
    emit DescriptionChanged(msg.sender, _description);
  }
}