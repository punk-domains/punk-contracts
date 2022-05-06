// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IPunkTLD is IERC721 {
  struct Domain {
    string name; // domain name that goes before the TLD name; example: "tempetechie" in "tempetechie.web3"
    uint256 tokenId;
    address holder;
    string data; // stringified JSON object, example: {"description": "Some text", "twitter": "@techie1239", "friends": ["0x123..."], "url": "https://punk.domains"}
  }

  event DomainCreated(address indexed user, address indexed owner, string fullDomainName);
  event DefaultDomainChanged(address indexed user, string defaultDomain);

  function domains(string calldata _domainName) external view returns(string memory, uint256, address, string memory);

  function getDomainHolder(string calldata _domainName) external view returns(address);

  function getFactoryOwner() external view returns(address);

  function price() external view returns (uint256);
  function referral() external view returns (uint256);

  function changeDescription(string calldata _description) external;

  function changeNameMaxLength(uint256 _maxLength) external;

  function changePrice(uint256 _price) external;

  function changeReferralFee(uint256 _referral) external;

  function mint(
    string memory _domainName,
    address _domainHolder,
    address _referrer
  ) external payable returns(uint256);

  function transferOwnership(address newOwner) external;

}
