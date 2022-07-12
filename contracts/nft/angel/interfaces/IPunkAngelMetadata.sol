// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

interface IPunkAngelMetadata {

  function getMetadata(
    string calldata _domainName, 
    string calldata _tld, 
    uint256 _tokenId
  ) external view returns(string memory);

  function setUniqueFeaturesId(
    uint256 _tokenId, 
    string[] calldata _unqs, 
    uint256 _price
  ) external returns(string memory selectedFeatureId);

}
