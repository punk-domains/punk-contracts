// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IFlexiPunkTLD is IERC721 {

  function domains(string calldata _domainName) external view returns(string memory, uint256, address, string memory);

  function owner() external view returns(address);

  function getDomainHolder(string calldata _domainName) external view returns(address);

  function price() external view returns (uint256);

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable returns(uint256);

}
