// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract usd is Ownable, ERC20 {

    address public manager;

    modifier onlyManager() {
        require(msg.sender == manager || msg.sender == owner(), "OM");
        _;
    }

    constructor() ERC20("Stable", "USDT") {
    }

    function mint(address _to, uint256 _amount) external onlyManager {
        _mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) external onlyManager {
        _burn(_from, _amount);
    }
    
    function setManager(address _manager) external onlyOwner {
        manager = _manager;
    }

}