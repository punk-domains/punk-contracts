// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../lib/strings.sol";

/// @title Domain metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for a TLD
contract DopeMetadata is Ownable {
  string public description = "The official web3 name of the Dope Wars DAO.";
  string public brand = "Dope Wars";

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
        '<rect x="0" y="0" width="500" height="500" fill="#F8C545"/>',
        '<g transform="translate(150,240) scale(0.05,-0.05)" stroke="none"><path d="M2000 3384 c-14 -2 -52 -9 -85 -15 -33 -5 -116 -25 -185 -43 -69 -18 -143 -37 -165 -42 -49 -12 -361 -232 -458 -323 -97 -92 -155 -169 -234 -312 -38 -69 -85 -146 -105 -172 -25 -33 -38 -64 -47 -109 -6 -35 -30 -120 -53 -189 l-42 -126 13 -119 c34 -321 80 -564 123 -648 21 -41 149 -218 241 -333 94 -117 214 -197 343 -229 38 -9 90 -28 116 -40 26 -13 86 -36 135 -51 84 -25 98 -27 298 -27 175 0 226 4 305 21 194 43 351 117 500 238 38 30 96 71 129 90 34 20 61 39 61 43 0 4 43 61 95 127 53 66 111 147 130 180 28 50 145 320 217 499 15 38 21 92 29 250 12 226 12 225 -38 431 -42 175 -71 246 -139 335 -93 123 -273 326 -311 353 -93 64 -317 149 -493 187 -91 20 -321 35 -380 24z m257 -343 c263 -51 473 -192 617 -414 70 -107 88 -145 120 -244 57 -183 57 -341 -3 -573 -76 -302 -216 -502 -465 -668 -178 -119 -302 -172 -402 -172 -22 0 -79 -12 -129 -27 -84 -24 -94 -25 -160 -14 -91 15 -255 71 -346 117 -210 105 -274 169 -385 387 -42 84 -86 165 -97 180 -16 23 -18 36 -12 70 9 44 9 119 4 322 -4 106 -1 128 19 185 39 109 138 301 190 370 110 144 349 350 463 399 66 29 144 51 184 51 17 1 62 12 100 25 88 29 174 31 302 6z"/><path d="M1795 2528 c-91 -79 -117 -238 -61 -371 19 -46 56 -71 95 -62 39 8 56 29 87 105 22 54 26 78 25 163 -1 106 -16 155 -55 182 -31 22 -51 18 -91 -17z"/><path d="M2263 2440 c-13 -5 -40 -35 -60 -67 l-38 -58 2 -108 c1 -84 6 -114 20 -139 55 -93 123 -47 189 130 43 113 28 204 -40 236 -38 18 -42 18 -73 6z"/><path d="M1276 2244 c-25 -25 -16 -84 25 -148 25 -40 33 -67 40 -127 14 -137 46 -224 130 -345 106 -153 255 -259 429 -303 62 -15 87 -17 140 -9 36 5 85 7 109 5 104 -11 211 45 343 180 52 53 77 89 112 164 55 115 93 169 139 198 45 28 53 60 28 115 -24 54 -44 62 -128 45 -58 -12 -68 -11 -95 4 -34 19 -54 13 -87 -29 -26 -34 -27 -64 -1 -97 25 -32 25 -52 -1 -124 -54 -144 -142 -220 -318 -273 -208 -64 -427 39 -542 253 -63 116 -99 202 -99 236 0 29 9 43 54 85 63 60 68 72 51 114 -16 37 -46 47 -109 38 -30 -5 -57 -2 -87 10 -69 26 -113 29 -133 8z"/></g>',
        '<text x="50%" y="55%" dominant-baseline="middle" fill="#000000" text-anchor="middle" font-size="x-large" font-family="monospace">',
        _fullDomainName,'</text>',
        '<text x="50%" y="80%" dominant-baseline="middle" fill="#000000" text-anchor="middle" font-family="monospace">',
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