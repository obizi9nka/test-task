// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./interfaces/IRoleContract.sol";
import "./TransferHelper.sol";
import "./interfaces/IinvestPool.sol";
import "hardhat/console.sol";

contract InvestPool is Ownable, IinvestPool {

    // =================================
    // Storage
    // =================================

    IRoleContract public immutable rolesContract;
    address public immutable LPtoken;
    address public immutable paymentToken;
    uint8 private immutable paymentTokenDecimals;
    address public immutable fundrisingWallet;

    uint256 public baseFee;
    uint256 public price;

    uint256 public maxAmountToSell;
    uint256 public alreadySold;
    uint256 public totalPaymentTokenSpended;
    uint256 public totalLPDeposited;

    mapping(address => uint256) public alreadyBought;

    struct RoleSettings {
        uint256 startTime;
        uint256 deadline;
        uint256 roleFee;
        uint256 maxAmountToSellForRole;
        uint256 soldAmountForThisRole;
        uint256 totalAmountOfPaymentTokenSpended;
    }

    mapping(uint256 => RoleSettings) public roleSettings;

    

    address public manager;

    // =================================
    // Modifier
    // =================================

    modifier onlyManager() {
        require(msg.sender == manager || msg.sender == owner(), "OM");
        _;
    }

    // =================================
    // Events
    // =================================

    event RoleSettingsChanged(uint256 roleNumber, uint256 startTime, uint256 deadline, uint256 roleFee, uint256 maxAmountToSellForRole);
    event Purchase(address user, uint256 amount);

    // =================================
    // Constructor
    // =================================

    constructor(ConstructorParams memory params) {
        require(params._baseFee <= 1000, "FTH");

        LPtoken = params._LPtoken;
        rolesContract = IRoleContract(params._rolesContract);
        paymentToken = params._paymentToken;
        paymentTokenDecimals = IERC20Metadata(params._paymentToken).decimals();
        fundrisingWallet = params._fundrisingWallet;

        baseFee = params._baseFee;
        price = params._price;
        maxAmountToSell = params._maxAmountToSell;
        manager = params._manager;

        setRoleSettings(params._roleSettings);
    }

    // =================================
    // Functions
    // =================================

    function buy(uint256 paymentTokenAmount) external {
        uint256 userRoleNum = rolesContract.getRoleNumber(msg.sender);
        (uint256 minAmountForRole, uint256 maxAmountForRole) = rolesContract.getAmounts(msg.sender);

        RoleSettings storage userRole = roleSettings[userRoleNum];

        uint256 afterFeesPaymentTokenAmount = paymentTokenAmount * (1000 - 
            (userRole.roleFee == 0 ? baseFee : userRole.roleFee)
            ) / 1000;

        uint256 tokenAmount = afterFeesPaymentTokenAmount * (10 ** (20 - paymentTokenDecimals)) / price;
        
        console.log(afterFeesPaymentTokenAmount, minAmountForRole, alreadyBought[msg.sender] + afterFeesPaymentTokenAmount, maxAmountForRole);
        require(afterFeesPaymentTokenAmount >= minAmountForRole && alreadyBought[msg.sender] + afterFeesPaymentTokenAmount <= maxAmountForRole, "IA");

        console.log(block.timestamp, userRole.startTime, userRole.deadline);
        require(block.timestamp >= userRole.startTime && block.timestamp <= userRole.deadline, "TE");

        console.log(userRole.soldAmountForThisRole, tokenAmount, userRole.maxAmountToSellForRole);
        require(userRole.soldAmountForThisRole + tokenAmount <= userRole.maxAmountToSellForRole, "RR");

        console.log(alreadySold, tokenAmount, maxAmountToSell);
        require(alreadySold + tokenAmount <= maxAmountToSell, "LT");

        TransferHelper.safeTransferFrom(paymentToken, msg.sender, fundrisingWallet, paymentTokenAmount);

        alreadyBought[msg.sender] += afterFeesPaymentTokenAmount;
        userRole.soldAmountForThisRole += tokenAmount;
        alreadySold += tokenAmount;
        totalPaymentTokenSpended += paymentTokenAmount;
        userRole.totalAmountOfPaymentTokenSpended += paymentTokenAmount;

        TransferHelper.safeTransfer(LPtoken, msg.sender, tokenAmount);

        emit Purchase(msg.sender, tokenAmount);
    }

    // =================================
    // Admin functions
    // =================================

    function setMaxAmountToSell(uint256 _maxAmountToSell) external onlyManager {
        maxAmountToSell = _maxAmountToSell;
    }

    function setRoleSettings(
        RoleSettingsSetter[] memory _roleSettings
    ) public onlyManager {
        for (uint256 i = 0; i < _roleSettings.length; i++) {
            roleSettings[_roleSettings[i].roleNumber].startTime = _roleSettings[i].startTime;
            roleSettings[_roleSettings[i].roleNumber].deadline = _roleSettings[i].deadline;
            roleSettings[_roleSettings[i].roleNumber].roleFee = _roleSettings[i].roleFee;
            roleSettings[_roleSettings[i].roleNumber].maxAmountToSellForRole = _roleSettings[i].maxAmountToSellForRole;
            emit RoleSettingsChanged(
                _roleSettings[i].roleNumber,
                _roleSettings[i].startTime,
                _roleSettings[i].deadline,
                _roleSettings[i].roleFee,
                _roleSettings[i].maxAmountToSellForRole
            );
        }
    }

    function setRoleSetting(
        RoleSettingsSetter memory _rolesSetting
    ) external onlyManager {
        roleSettings[_rolesSetting.roleNumber].startTime = _rolesSetting.startTime;
        roleSettings[_rolesSetting.roleNumber].deadline = _rolesSetting.deadline;
        roleSettings[_rolesSetting.roleNumber].roleFee = _rolesSetting.roleFee;
        roleSettings[_rolesSetting.roleNumber].maxAmountToSellForRole = _rolesSetting.maxAmountToSellForRole;
        emit RoleSettingsChanged(
            _rolesSetting.roleNumber,
            _rolesSetting.startTime, 
            _rolesSetting.deadline,
            _rolesSetting.roleFee,
            _rolesSetting.maxAmountToSellForRole
        );
    }

    function setPrice(uint256 _price) external onlyManager {
        price = _price;
    }

    function setBaseFee(uint256 _baseFee) external onlyManager {
        require(_baseFee <= 1000, "FTH");
        baseFee = _baseFee;
    }

    function updateSettings(
        RoleSettingsSetter[] memory _roleSettings,
        uint256 _price,
        uint256 _baseFee,
        uint256 _maxAmountToSell
    ) external onlyManager {
        setRoleSettings(_roleSettings);
        price = _price;
        baseFee = _baseFee;
        maxAmountToSell = _maxAmountToSell;
    }

    function depositLPtoken(uint256 _amount) external onlyManager {
        TransferHelper.safeTransferFrom(LPtoken, msg.sender, address(this), _amount);
        totalLPDeposited += _amount;
    }

    function withdrawLPtoken(address _to, uint256 _amount) external onlyManager {
        TransferHelper.safeTransfer(LPtoken, _to, _amount);
        if (totalLPDeposited >= _amount) {
            totalLPDeposited -= _amount;
        } else {
            totalLPDeposited = 0;
        }
    }

    function setManager(address _manager) external onlyOwner {
        manager = _manager;
    }

}
