// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../lib/strings.sol";

/// @title Domain metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for a TLD
contract GivethMetadata is Ownable {
  string public description = "Giveth Names are web3 usernames brought to you by Giveth and Punk Domains. Proceeds from minting new .giveth names go into the Giveth Mathcing Pool.";
  string public brand = "Giveth Names";

  // EVENTS
  event DescriptionChanged(address indexed user, string description);
  event BrandChanged(address indexed user, string brand);

  // READ
  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns(string memory) {
    string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));
    uint256 domainLength = strings.len(strings.toSlice(_domainName));

    return string(
      abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(abi.encodePacked(
        '{"name": "', fullDomainName, '", ',
        '"description": "', description, '", ',
        '"attributes": [',
          '{"trait_type": "length", "value": "', Strings.toString(domainLength) ,'"}'
        '], '
        '"image": "', _getImage(fullDomainName), '"}'))))
    );
  }

  function _getImage(string memory _fullDomainName) internal view returns (string memory) {
    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">',
        '<rect x="0" y="0" width="500" height="500" fill="#5326ec"/>',
        '<g transform="scale(0.15 0.15) translate(1150, 200)"><path d="M1040,552.3c-1,14.1-1.4,28.2-3.1,42.2-18.2,148.1-87.3,266.8-208.6,353.8-90.6,64.9-192.8,95.2-304.2,91.4-128.8-4.5-239.8-52.4-333-141.5-.8-.8-.8-4.1,0-5Q365.4,718.8,539.9,544.6a15.5,15.5,0,0,1,10-4.1q245.1-.3,490.1-.2Z" fill="#ffffff"/><path d="M552.1,40c13.8,1,27.5,1.6,41.2,3.1q120.3,13,221.5,79.4l1.3,1.1-42.7,42.6c-9.3,9.2-18.5,18.6-27.9,27.7a4.8,4.8,0,0,1-2,.7,3.4,3.4,0,0,1-2-.3q-102-58.7-219.4-54c-175.2,7.1-328,131.2-370,301.4-26,105.4-11.5,205.6,42,300.1.5.9.6,2.9-.1,3.5q-34.8,35.1-69.9,70.1l-1.1.8c-2.2-3.4-4.4-6.7-6.5-10.1-57.7-93.3-83.2-194.8-75-304.3C58.7,274.1,228.2,87.5,453.7,47.9c22.8-4,46.1-5,69.2-7.4l4.7-.5Z" fill="#ffffff"/><path d="M805.6,341.8A89.8,89.8,0,1,1,832,405.7a89.7,89.7,0,0,1-26.4-63.9Z" fill="#ffffff"/></g>'
        '<text x="50%" y="55%" dominant-baseline="middle" fill="white" text-anchor="middle" font-size="x-large" font-family="sans-serif">',
        _fullDomainName,'</text>',
        '<text x="50%" y="80%" dominant-baseline="middle" fill="white" text-anchor="middle" font-family="sans-serif">',
        brand,'</text>',
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

  /// @notice Only metadata contract owner can call this function.
  function changeBrand(string calldata _brand) external onlyOwner {
    brand = _brand;
    emit BrandChanged(msg.sender, _brand);
  }
}