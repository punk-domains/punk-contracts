// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

interface IRenewablePunkMetadata {

  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId, uint256 _expiry) external view returns(string memory);

}
