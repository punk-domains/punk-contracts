// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PunkAngelWhitelist is Ownable {

  bool public paused = false;
  uint256 public totalAddresses = 0;
  uint256 public totalAmount = 0;
  
  mapping (address => bool) public whitelisted;
  mapping (address => uint256) public expectedAmount;

  address[] public whitelistedAddresses;

  // EVENTS
  event UserJoinWhitelist(address user, uint256 amount);

  // READ
  function isWhitelisted(address _user) external view returns(bool) {
    return whitelisted[_user];
  }

  // WRITE
  function joinWhitelist(uint256 _amount) external {
    require(!paused || msg.sender == owner(), "Whitelisting is paused.");
    require(_amount <= 50_000, "Amount is too high.");

    _addToWhitelist(msg.sender, _amount);
  }

  function _addToWhitelist(address _addr, uint256 _amount) internal {
    if (whitelisted[_addr]) {
      // if user already whitelisted
      totalAmount -= expectedAmount[_addr]; // subtract the previous amount from total
      expectedAmount[_addr] = _amount; // store new amount
      totalAmount += _amount; // add new amount to total
    } else {
      // if not yet whitelisted
      whitelisted[_addr] = true;
      expectedAmount[_addr] = _amount;
      whitelistedAddresses.push(_addr);
      ++totalAddresses;
      totalAmount += _amount;
    }

    emit UserJoinWhitelist(_addr, _amount);
  }

  // OWNER
  function ownerAddToWhitelist(address[] calldata _addresses, uint256[] calldata _amounts) external onlyOwner {
    uint256 length = _addresses.length;

    for (uint256 i = 0; i < length;) {
      _addToWhitelist(_addresses[i], _amounts[i]);
      unchecked { ++i; }
    }
  }

  function togglePaused() external onlyOwner {
    paused = !paused;
  }

}