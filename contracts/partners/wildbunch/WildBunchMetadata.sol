// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../../lib/strings.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title The Wild Bunch TLD Metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for TLD contracts.
contract WildBunchMetadata is Ownable {
  string public description = ".wildbunch is a domain extension by The Wild Bunch NFT community (powered by the Punk Domains protocol)";
  string public brand = "<text x='50%' y='70%' font-family='Georgia' dominant-baseline='middle' fill='white' text-anchor='middle'>The Wild Bunch</text>";
  string public bgColor = "black";
  string public textColor = "white";
  string public textFont = "Georgia";

  // <text x='50%' y='70%' dominant-baseline='middle' fill='white' text-anchor='middle'>lol</text>

  // READ
  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns(string memory) {
    string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));
    uint256 domainLength = strings.len(strings.toSlice(_domainName));

    return string(
      abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(abi.encodePacked(
        '{"name": "', fullDomainName, '", ',
        '"attributes": [{"trait_type": "length", "value": "', Strings.toString(domainLength) ,'"}], ',
        '"description": "', description, '", ',
        '"image": "', _getImage(fullDomainName), '"}'))))
    );
  }

  function _getImage(string memory _fullDomainName) internal view returns (string memory) {
    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">',
        '<rect x="0" y="0" width="500" height="500" fill="', bgColor, '"/>',
        '<text x="50%" y="50%" dominant-baseline="middle" fill="', textColor, 
        '" font-family="', textFont, '" text-anchor="middle" font-size="x-large">',
        _fullDomainName,'</text>',
        brand,
      '</svg>'
    ))));

    return string(abi.encodePacked("data:image/svg+xml;base64,", svgBase64Encoded));
  }

  // OWNER

  /// @notice Only contract owner can call this function.
  function changeBrand(string calldata _brand) external onlyOwner {
    brand = _brand;
  }

  /// @notice Only contract owner can call this function.
  function changeColors(string calldata _bgColor, string calldata _textColor) external onlyOwner {
    bgColor = _bgColor;
    textColor = _textColor;
  }

  /// @notice Only contract owner can call this function.
  function changeDescription(string calldata _description) external onlyOwner {
    description = _description;
  }

  /// @notice Only contract owner can call this function.
  function changeFont(string calldata _font) external onlyOwner {
    textFont = _font;
  }
}