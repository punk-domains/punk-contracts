// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../lib/strings.sol";

/// @title Domain metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for a TLD
contract FlareMetadata is Ownable {
  string public description = "Flare Domains - Your web3 username and digital identity powered by the Punk Domains protocol. Mint yours now on flr.domains.";
  string public brand = "https://flr.domains";

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
        '<rect x="0" y="0" width="500" height="500" fill="#b35160"/>',
        '<g fill="#ffffff" fill-opacity="1" transform="scale(0.70 0.70) translate(280)"><g transform="translate(0.0117232, 240.077547)"><g><path d="M 121.808594 -98.125 C 122.773438 -97.15625 123.417969 -96.996094 124.546875 -97.800781 L 137.277344 -107.628906 C 138.402344 -108.433594 138.402344 -110.046875 137.4375 -110.851562 L 130.1875 -118.265625 C 129.21875 -119.230469 127.769531 -119.070312 126.804688 -117.941406 L 116.976562 -105.375 C 116.167969 -104.246094 116.332031 -103.601562 117.457031 -102.472656 Z M 75.082031 -118.101562 C 75.246094 -116.8125 75.890625 -116.492188 77.339844 -116.492188 L 83.621094 -116.492188 C 84.910156 -116.492188 85.394531 -116.8125 85.71875 -118.101562 L 87.8125 -134.054688 C 87.972656 -135.503906 87.007812 -136.632812 85.71875 -136.632812 L 75.082031 -136.632812 C 73.792969 -136.632812 72.828125 -135.503906 73.148438 -134.054688 Z M 36.414062 -97.640625 C 37.542969 -96.835938 38.023438 -96.996094 39.152344 -97.960938 L 43.664062 -102.472656 C 44.632812 -103.441406 44.632812 -103.925781 43.824219 -105.050781 L 34.15625 -117.941406 C 33.351562 -118.910156 31.742188 -119.070312 30.773438 -118.101562 L 23.363281 -110.691406 C 22.394531 -109.722656 22.558594 -108.113281 23.683594 -107.46875 Z M 25.296875 -64.125 C 25.296875 -65.578125 24.972656 -66.058594 23.363281 -66.222656 L 7.574219 -68.476562 C 6.285156 -68.636719 5.15625 -67.511719 5.15625 -66.222656 L 5.15625 -55.75 C 5.15625 -54.460938 6.285156 -53.332031 7.574219 -53.652344 L 23.363281 -55.75 C 24.972656 -55.910156 25.296875 -56.394531 25.296875 -58.003906 Z M 39.3125 -24.167969 C 38.347656 -25.136719 37.703125 -25.296875 36.574219 -24.328125 L 23.847656 -14.824219 C 22.71875 -13.855469 22.71875 -12.40625 23.683594 -11.441406 L 31.097656 -4.027344 C 32.0625 -3.0625 33.511719 -3.0625 34.320312 -4.351562 L 43.988281 -16.917969 C 44.953125 -18.046875 44.792969 -18.691406 43.664062 -19.816406 Z M 86.039062 -4.027344 C 85.878906 -5.476562 85.234375 -5.800781 83.785156 -5.800781 L 77.5 -5.800781 C 76.210938 -5.800781 75.726562 -5.476562 75.246094 -4.027344 L 73.3125 11.761719 C 73.148438 13.050781 74.117188 14.339844 75.566406 14.339844 L 85.878906 14.339844 C 87.167969 14.339844 88.132812 13.050781 87.972656 11.761719 Z M 80.5625 -107.308594 C 55.105469 -107.308594 34.480469 -86.683594 34.480469 -61.226562 C 34.480469 -35.769531 55.105469 -15.144531 80.5625 -15.144531 C 106.019531 -15.144531 126.640625 -35.769531 126.640625 -61.226562 C 126.640625 -86.683594 106.019531 -107.308594 80.5625 -107.308594 Z M 124.871094 -24.492188 C 123.582031 -25.457031 123.097656 -25.457031 121.96875 -24.328125 L 117.457031 -19.816406 C 116.492188 -19.011719 116.492188 -18.367188 117.296875 -17.078125 L 126.964844 -4.511719 C 127.769531 -3.382812 129.382812 -3.222656 130.347656 -4.1875 L 137.597656 -11.441406 C 138.566406 -12.40625 138.402344 -14.019531 137.4375 -14.824219 Z M 137.597656 -66.542969 C 136.148438 -66.382812 135.828125 -65.898438 135.828125 -64.449219 L 135.828125 -58.164062 C 135.828125 -56.714844 136.148438 -56.230469 137.597656 -55.910156 L 153.550781 -53.816406 C 154.839844 -53.652344 155.964844 -54.78125 155.964844 -56.070312 L 155.964844 -66.382812 C 155.964844 -67.832031 154.839844 -68.800781 153.550781 -68.636719 Z M 137.597656 -66.542969 "/></g></g></g>'
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