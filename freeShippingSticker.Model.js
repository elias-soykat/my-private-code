const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize.db');
const AppConstants = require('../../utils/appConstants');

const FreeShippingStickerStatus = AppConstants.FreeShippingStickerStatus;

const FreeShippingSticker = sequelize.define('FreeShippingSticker', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  FreeShippingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ProductId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ProductVariantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  Source: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  StartDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  EndDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  StatusId: {
    type: DataTypes.SMALLINT,
    defaultValue: FreeShippingStickerStatus.Pending, // 0=PENDING, 1=APPLIED, 2=INACTIVE
  },
  IsActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  CreatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'FreeShippingSticker',
  schema: 'product',
  timestamps: false,
});


module.exports = FreeShippingSticker;