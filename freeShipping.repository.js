const { sequelize } = require("../../config/sequelize.db");
const db = require("../../models/index");
const AppConstants = require("../../utils/appConstants");
const bdtTime = require("../../utils/date.time");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const { QueryTypes } = require("sequelize");
const logger = require("../../logger/winston");
const axios = require("axios");

class FreeShippingRepository {
  updateApplyFreeShippingToEntireShop = async (
    freeShippingPayload,
    sellerId,
    transaction
  ) => {
    const [updatedProducts] = await db.Product.update(
      {
        FreeShippingStartAt: freeShippingPayload.StartDate,
        FreeShippingEndAt: freeShippingPayload.EndDate,
        IsFreeShippingApplied: true,
      },
      {
        where: {
          SellerId: sellerId,
          ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
        },
        transaction,
        returning: [
          "Id",
          "NameEn",
          "TotalStockQuantity",
          "FreeShippingStartAt",
          "FreeShippingEndAt",
          "IsFreeShippingApplied",
          "ParentSku",
          "ApprovalStatusId",
        ],
      }
    );
    return updatedProducts;
  };


  updateFreeShippingNewsForCustomer = async (
    freeShippingNewsId,
    IsAppliedToEntireShop,
    freeShippingPayload,
    sellerId,
    transaction
  ) => {
    return await db.FreeShippingNews.update(
      {
        Name: freeShippingPayload.Name,
        Description: freeShippingPayload.Description,
        FreeShippingBudget: freeShippingPayload.FreeShippingBudget,
        MinProductQuantity: 0,
        DiscountAmount: 0,
        IsConditional: freeShippingPayload.IsConditional,
        MinOrderAmount: freeShippingPayload.IsConditional
          ? freeShippingPayload.MinOrderAmount
          : 0,
        MaximumDiscount: 0,
        DiscountPercent: 0,
        UsageTimelineType: freeShippingPayload.IsLongTerm
          ? AppConstants.UsageTimelineType.Duration
          : AppConstants.UsageTimelineType.DateRange,
        DurationValue: 0,
        UsageTimelineStartDate: freeShippingPayload.StartDate,
        UsageTimelineEndDate: freeShippingPayload.EndDate,
        CollectionStartDate: freeShippingPayload.CollectionStartDate,
        CollectionEndDate: freeShippingPayload.CollectionEndDate,
        UsageLimitPerUser: freeShippingPayload.UsageLimitPerUser,
        CustomerType: AppConstants.CollectableCustomerType.All,
        DeviceType: [1],
        DiscountType: 0,
        UpdatedAt: bdtTime.getBdDateTime(),
        UpdatedBy: sellerId,
        StatusId: AppConstants.StatusId.Active,
        IsBlackListProduct:
          freeShippingPayload.FreeShippingRestrictions &&
          freeShippingPayload.FreeShippingRestrictions.length > 0
            ? true
            : false,
        IsProductUnlimited: IsAppliedToEntireShop,
        IsWhiteListProduct: IsAppliedToEntireShop == false ? true : false,
        IsAdmin: false,
        IsProductLimited: IsAppliedToEntireShop == false ? true : false,
        SellerId: sellerId,
        ScheduledJobId: null,
      },
      {
        where: {
          Id: freeShippingNewsId, SellerId: sellerId
        },
      },
      { transaction }
    );
  };

  updateFreeShippingWhiteListProductForCustomer = async (
    id,
    FreeShippingProducts,
    sellerId,
    transaction
  ) => {
        //  Bulk Insert FreeShippingWhiteListProducts For Customer
      if (FreeShippingProducts?.length) {
        await db.FreeShippingNewProductWhiteLists.bulkCreate(
          FreeShippingProducts.map((product) => ({
            ShippingVoucherId: id,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }
  };


  updateFreeShippingBlackListProductForCustomer = async (
    id,
    FreeShippingResProducts,
    sellerId,
    transaction
  ) => {
        //  Bulk Insert FreeShippingBlackListProducts For Customer
      if (FreeShippingResProducts?.length) {
        await db.FreeShippingNewProductBlackLists.bulkCreate(
          FreeShippingResProducts.map((product) => ({
            ShippingVoucherId: id,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }
  };

  updateApplyFreeShippingToProducts = async (
    freeShippingPayload,
    products,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const updatedProductsPromises = products.map(async (product) => {
      const [updatedProducts] = await db.Product.update(
        {
          FreeShippingStartAt: freeShippingPayload.StartDate,
          FreeShippingEndAt: freeShippingPayload.EndDate,
          IsFreeShippingApplied: true,
        },
        {
          where: {
            SellerId: sellerId,
            Id: product.ProductId,
            ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
          },
          transaction,
          returning: [
            "Id",
            "NameEn",
            "TotalStockQuantity",
            "FreeShippingStartAt",
            "FreeShippingEndAt",
            "IsFreeShippingApplied",
            "ParentSku",
            "ApprovalStatusId",
          ],
        }
      );
      return updatedProducts;
    });

    const updatedProductsArrays = await Promise.all(updatedProductsPromises);
    return updatedProductsArrays.flat();
  };

  // create FreeShipping

  CreateFreeShippingRepository = async (payload, sellerId, headers) => {
    const transaction = await sequelize.transaction();

    try {
      const {
        FreeShippingRestrictions,
        IsAppliedToEntireShop,
        FreeShippingProducts,
        IsLongTerm,
        ...freeShippingPayload
      } = payload;

      const restrictionsTypeId =
        FreeShippingRestrictions &&
        Array.isArray(FreeShippingRestrictions) &&
        FreeShippingRestrictions.length > 0
          ? AppConstants.RestrictionType.Restriction
          : null;

      const today = bdtTime.getBdDateTime();
      if (IsLongTerm) {
        const sixMonthsLater = bdtTime.getBdDateTime(today);
        sixMonthsLater.setMonth(today.getMonth() + 6);

        freeShippingPayload.IsLongTerm = true;
        freeShippingPayload.StartDate = today.toISOString();
        freeShippingPayload.EndDate = sixMonthsLater.toISOString();
        freeShippingPayload.CollectionStartDate = today.toISOString();
      } else {
        freeShippingPayload.IsLongTerm = false;
      }

      // create freeShipping for customer
      const createdFreeShippingNews =
        await this.createFreeShippingNewsForCustomer(
          IsAppliedToEntireShop,
          freeShippingPayload,
          sellerId,
          transaction
        );

      let FreeShipping = null;

      if (createdFreeShippingNews) {
        //create freeShipping For Seller
        FreeShipping = await this.createFreeShipping(
          createdFreeShippingNews.Id,
          restrictionsTypeId,
          IsAppliedToEntireShop,
          freeShippingPayload,
          sellerId,
          transaction
        );
      }

      // create FreeShipping WhiteList Products For Customer
      if (
        IsAppliedToEntireShop === false &&
        Array.isArray(FreeShippingProducts) &&
        FreeShippingProducts.length > 0
      ) {
        await this.createFreeShippingWhiteListProducts(
          createdFreeShippingNews.Id,
          FreeShippingProducts,
          sellerId,
          transaction
        );
      }

      //create FreeShipping Products For Seller
      const createdFreeShippingProducts = await this.createFreeShippingProducts(
        createdFreeShippingNews.Id,
        FreeShippingProducts,
        sellerId,
        transaction
      );

      // create FreeShipping BlackList Products For Customer
      if (
        FreeShippingRestrictions &&
        Array.isArray(FreeShippingRestrictions) &&
        FreeShippingRestrictions.length > 0
      ) {
        await this.createFreeShippingBlackListProducts(
          createdFreeShippingNews.Id,
          FreeShippingRestrictions,
          sellerId,
          transaction
        );
      }

      //create FreeShipping Products Restrictions For Seller
      const createdFreeShippingProductsRestrictions =
        await this.createFreeShippingProductsRestrictions(
          createdFreeShippingNews.Id,
          FreeShippingRestrictions,
          sellerId,
          transaction
        );

      // let updatedProducts = [];
      // // apply freeShipping Entire Shop For Seller
      // if (IsAppliedToEntireShop) {
      //   updatedProducts = await this.applyFreeShippingToEntireShop(
      //     freeShippingPayload.StartDate,
      //     freeShippingPayload.EndDate,
      //     sellerId,
      //     transaction
      //   );
      // } else {
      //   // apply freeShipping to specific products for Seller
      //   updatedProducts = await this.createApplyFreeShippingToProducts(
      //     freeShippingPayload.StartDate,
      //     freeShippingPayload.EndDate,
      //     FreeShippingProducts,
      //     sellerId,
      //     transaction
      //   );
      // }
      // // apply freeShipping to restricted products for Seller
      // if (createdFreeShippingProductsRestrictions) {
      //   await this.applyFreeShippingToRestrictedProducts(
      //     FreeShippingRestrictions,
      //     sellerId,
      //     transaction
      //   );
      // }


      // -------logistic--------
      const processData = {
        Id: createdFreeShippingNews.Id,
        Name: createdFreeShippingNews.Name,
        IsFromAdmin: createdFreeShippingNews.IsAdmin,
        SellerId: createdFreeShippingNews.SellerId || sellerId,
        StatusId: createdFreeShippingNews.StatusId,
        AdminPercent: createdFreeShippingNews.AdminPercent || null,
        SellerPercent: createdFreeShippingNews.SellerPercent || null,
      };

      const URL = `${process.env.LOGISTICS_SERVER_URL}/api/FreeShipping/Create`;

      //  HTTP POST request to the logistic service
      await axios.post(URL, processData, { headers });

      await transaction.commit();

      return {
        ...FreeShipping.get({ plain: true }),
        FreeShippingProducts: createdFreeShippingProducts,
        FreeShippingProductsRestriction:
          createdFreeShippingProductsRestrictions,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(error);
      throw error;
    }
  };

  createFreeShipping = async (
    freeShippingNewsId,
    restrictionsTypeId,
    IsAppliedToEntireShop,
    freeShippingPayload,
    sellerId,
    transaction
  ) => {
    return await db.FreeShipping.create(
      {
        ...freeShippingPayload,
        Id: freeShippingNewsId,
        IsAppliedToEntireShop,
        FreeVoucherRefTypeId: AppConstants.FreeVoucherType.OnSellerProduct,
        RestrictionsTypeId: restrictionsTypeId,
        SellerId: sellerId,
        CreatedBy: sellerId,
        StatusId: AppConstants.StatusId.Active,
        CreatedAt: bdtTime.getBdDateTime(),
      },
      { transaction }
    );
  };

  createFreeShippingNewsForCustomer = async (
    IsAppliedToEntireShop,
    freeShippingPayload,
    sellerId,
    transaction
  ) => {
    return await db.FreeShippingNews.create(
      {
        Name: freeShippingPayload.Name,
        Description: freeShippingPayload.Description,
        FreeShippingBudget: freeShippingPayload.FreeShippingBudget,
        MinProductQuantity: 0,
        DiscountAmount: 0,
        IsConditional: freeShippingPayload.IsConditional,
        MinOrderAmount: freeShippingPayload.IsConditional
          ? freeShippingPayload.MinOrderAmount
          : 0,
        MaximumDiscount: 0,
        DiscountPercent: 0,
        UsageTimelineType: freeShippingPayload.IsLongTerm
          ? AppConstants.UsageTimelineType.Duration
          : AppConstants.UsageTimelineType.DateRange,
        DurationValue: 0,
        UsageTimelineStartDate: freeShippingPayload.StartDate,
        UsageTimelineEndDate: freeShippingPayload.EndDate,
        CollectionStartDate: freeShippingPayload.CollectionStartDate,
        CollectionEndDate: freeShippingPayload.CollectionEndDate,
        UsageLimitPerUser: freeShippingPayload.UsageLimitPerUser,
        CustomerType: AppConstants.CollectableCustomerType.All,
        DeviceType: [1],
        DiscountType: 0,
        CreatedAt: bdtTime.getBdDateTime(),
        CreatedBy: sellerId,
        StatusId: AppConstants.StatusId.Active,
        IsBlackListProduct:
          freeShippingPayload.FreeShippingRestrictions &&
          freeShippingPayload.FreeShippingRestrictions.length > 0
            ? true
            : false,
        IsProductUnlimited: IsAppliedToEntireShop,
        IsWhiteListProduct: IsAppliedToEntireShop == false ? true : false,
        IsAdmin: false,
        IsProductLimited: IsAppliedToEntireShop == false ? true : false,
        SellerId: sellerId,
        ScheduledJobId: null,
      },
      { transaction }
    );
  };

  createFreeShippingProducts = async (
    freeShippingId,
    products,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const createdProducts = await Promise.all(
      products.map(async (product) => {
        return await db.FreeShippingProducts.create(
          {
            FreeShippingId: freeShippingId,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          },
          { transaction }
        );
      })
    );

    return createdProducts;
  };

  createFreeShippingWhiteListProducts = async (
    freeShippingId,
    whiteListProducts,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(whiteListProducts) || whiteListProducts.length === 0)
      return [];

    const createdProducts = await Promise.all(
      whiteListProducts.map(async (product) => {
        return await db.FreeShippingNewProductWhiteLists.create(
          {
            ShippingVoucherId: freeShippingId,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          },
          { transaction }
        );
      })
    );

    return createdProducts;
  };

  createFreeShippingProductsRestrictions = async (
    freeShippingId,
    restriction,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(restriction) || restriction.length === 0) return [];

    const ProductsRestrictions = await Promise.all(
      restriction.map(async (restrict) => {
        return await db.FreeShippingRestrictions.create(
          {
            FreeShippingId: freeShippingId,
            ProductId: restrict.ProductId,
            ProductVariantId: restrict.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          },
          { transaction }
        );
      })
    );

    return ProductsRestrictions;
  };

  createFreeShippingBlackListProducts = async (
    freeShippingId,
    blackListProducts,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(blackListProducts) || blackListProducts.length === 0)
      return [];

    const ProductsRestrictions = await Promise.all(
      blackListProducts.map(async (product) => {
        return await db.FreeShippingNewProductBlackLists.create(
          {
            ShippingVoucherId: freeShippingId,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          },
          { transaction }
        );
      })
    );

    return ProductsRestrictions;
  };

  applyFreeShippingToEntireShop = async (
    StartDate,
    EndDate,
    sellerId,
    transaction
  ) => {
    const [updatedProducts] = await db.Product.update(
      {
        FreeShippingStartAt: StartDate,
        FreeShippingEndAt: EndDate,
        IsFreeShippingApplied: true,
      },
      {
        where: {
          SellerId: sellerId,
          ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
        },
        transaction,
        returning: [
          "Id",
          "NameEn",
          "TotalStockQuantity",
          "FreeShippingStartAt",
          "FreeShippingEndAt",
          "IsFreeShippingApplied",
          "ParentSku",
          "ApprovalStatusId",
        ],
      }
    );
    return updatedProducts;
  };

  createApplyFreeShippingToProducts = async (
    StartDate,
    EndDate,
    products,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const updatedProductsPromises = products.map(async (product) => {
      const [updatedProducts] = await db.Product.update(
        {
          FreeShippingStartAt: StartDate,
          FreeShippingEndAt: EndDate,
          IsFreeShippingApplied: true,
        },
        {
          where: {
            SellerId: sellerId,
            Id: product.ProductId,
            ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
          },
          transaction,
          returning: [
            "Id",
            "NameEn",
            "TotalStockQuantity",
            "FreeShippingStartAt",
            "FreeShippingEndAt",
            "IsFreeShippingApplied",
            "ParentSku",
            "ApprovalStatusId",
          ],
        }
      );
      return updatedProducts;
    });

    const updatedProductsArrays = await Promise.all(updatedProductsPromises);
    return updatedProductsArrays.flat();
  };

  applyFreeShippingToProducts = async (
    StartDate,
    EndDate,
    products,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(products) || products.length === 0) return [];

    const updatedProductsPromises = products.map(async (product) => {
      const [updatedProducts] = await db.Product.update(
        {
          FreeShippingStartAt: StartDate,
          FreeShippingEndAt: EndDate,
          IsFreeShippingApplied: true,
        },
        {
          where: {
            SellerId: sellerId,
            Id: product,
            ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
          },
          transaction,
          returning: [
            "Id",
            "NameEn",
            "TotalStockQuantity",
            "FreeShippingStartAt",
            "FreeShippingEndAt",
            "IsFreeShippingApplied",
            "ParentSku",
            "ApprovalStatusId",
          ],
        }
      );
      return updatedProducts;
    });

    const updatedProductsArrays = await Promise.all(updatedProductsPromises);
    return updatedProductsArrays.flat();
  };

  applyFreeShippingToRestrictedProducts = async (
    restrictedProducts,
    sellerId,
    transaction
  ) => {
    if (!Array.isArray(restrictedProducts) || restrictedProducts.length === 0)
      return [];

    await Promise.all(
      restrictedProducts.map(async (product) => {
        await db.Product.update(
          {
            FreeShippingStartAt: null,
            FreeShippingEndAt: null,
            IsFreeShippingApplied: false,
          },
          {
            where: {
              SellerId: sellerId,
              Id: product.ProductId,
              ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
            },
            transaction,
          }
        );
      })
    );
  };

  adminCreateFreeShippingRepository = async (payload, adminId, headers) => {
    const transaction = await sequelize.transaction();

    try {
      let {
        FreeVoucherRefTypeId,
        FreeShippingRestrictions,
        FreeShippingProducts,
        FreeShippingCategories,
        ...freeShippingPayload
      } = payload;

      const restrictionsTypeId =
        FreeShippingRestrictions &&
        Array.isArray(FreeShippingRestrictions) &&
        FreeShippingRestrictions.length > 0
          ? AppConstants.RestrictionType.Restriction
          : null;

      const campaignValue =
        FreeVoucherRefTypeId &&
        FreeVoucherRefTypeId === AppConstants.FreeVoucherType.CampaignType
          ? true
          : null;

      let sellerValue =
        FreeVoucherRefTypeId &&
        FreeVoucherRefTypeId === AppConstants.FreeVoucherType.OnSellerProduct
          ? payload.SellerId
          : 0;

      const createdFreeShipping = await db.FreeShipping.create(
        {
          ...freeShippingPayload,
          SellerId: sellerValue,
          FreeVoucherRefTypeId: FreeVoucherRefTypeId,
          IsForCampaign: campaignValue,
          RestrictionsTypeId: restrictionsTypeId,
          CreatedBy: adminId,
          StatusId: AppConstants.StatusId.Active,
          CreatedAt: bdtTime.getBdDateTime(),
        },
        { transaction }
      );

      if (
        FreeShippingProducts &&
        Array.isArray(FreeShippingProducts) &&
        FreeShippingProducts.length > 0
      ) {
        const productCreationPromises = FreeShippingProducts.map(
          async (product) => {
            await db.FreeShippingProducts.create(
              {
                FreeShippingId: createdFreeShipping.Id,
                ProductId: product.ProductId,
                ProductVariantId: product.ProductVariantId,
                CreatedAt: bdtTime.getBdDateTime(),
                CreatedBy: adminId,
                StatusId: AppConstants.StatusId.Active,
              },
              { transaction }
            );
          }
        );
        await Promise.all(productCreationPromises);
      }

      if (
        FreeShippingRestrictions &&
        Array.isArray(FreeShippingRestrictions) &&
        FreeShippingRestrictions.length > 0
      ) {
        const restrictionCreationPromises = FreeShippingRestrictions.map(
          (product) => {
            return db.FreeShippingRestrictions.create(
              {
                FreeShippingId: createdFreeShipping.Id,
                ProductId: product.ProductId,
                ProductVariantId: product.ProductVariantId,
                CreatedAt: bdtTime.getBdDateTime(),
                CreatedBy: adminId,
                StatusId: AppConstants.StatusId.Active,
              },
              { transaction }
            );
          }
        );
        await Promise.all(restrictionCreationPromises);
      }

      if (
        FreeVoucherRefTypeId &&
        FreeVoucherRefTypeId === AppConstants.FreeVoucherType.CategoryType
      ) {
        const categoryCreationPromises = FreeShippingCategories.map(
          (CategoryId) => {
            return db.FreeShippingProductCategories.create(
              {
                FreeShippingId: createdFreeShipping.Id,
                CategoryId: CategoryId,
                CreatedAt: bdtTime.getBdDateTime(),
                CreatedBy: adminId,
                StatusId: AppConstants.StatusId.Active,
              },
              { transaction }
            );
          }
        );
        await Promise.all(categoryCreationPromises);
      }

      //--logistic
      const processData = {
        Id: createdFreeShipping.Id,
        Name: createdFreeShipping.Name,
        IsFromAdmin: createdFreeShipping.IsFromAdmin,
        SellerId: sellerValue,
        StatusId: createdFreeShipping.StatusId,
        AdminPercent: createdFreeShipping.AdminPercent || null,
        SellerPercent: createdFreeShipping.SellerPercent || null,
      };

      const URL = `${process.env.LOGISTICS_SERVER_URL}/api/FreeShipping/Create`;

      //  HTTP POST request to the logistic service
      await axios.post(URL, processData, { headers });

      await transaction.commit();

      return createdFreeShipping;
    } catch (error) {
      await transaction.rollback();
      logger.error(error);
      throw error;
    }
  };

  getFreeShippingAllData = async (id) => {
    try {
      return await db.FreeShipping.findOne({
        where: {
          Id: id,
          StatusId: AppConstants.StatusId.Active,
        },
        include: [
          {
            model: db.FreeShippingProducts,
            as: "FreeShippingProducts",
          },
          {
            model: db.FreeShippingRestrictions,
            as: "FreeShippingRestrictions",
          },
          {
            model: db.FreeShippingProductCategories,
            as: "FreeShippingProductCategories",
          },
        ],
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  getFreeShippingDataForLogistic = async (id) => {
    try {
      return await db.FreeShipping.findOne({
        where: {
          Id: id,
          StatusId: AppConstants.StatusId.Active,
        },
        attributes: [
          "Id",
          "Name",
          "IsFromAdmin",
          "SellerId",
          "StatusId",
          "AdminPercent",
          "SellerPercent",
        ],
      });
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  getAllFreeShippingRepository = async (sellerId, options) => {
    try {
      const currentDate = bdtTime.getBdDateTime();

      const page =
        parseInt(options?.page) || parseInt(process.env.PAGINATE_CURRENT_PAGE);
      const size =
        parseInt(options?.size) || parseInt(process.env.PAGINATE_PAGE_SIZE);

      let searchParam = {};

      if (options?.searchParam) {
        searchParam = {
          [Op.or]: [
            { Name: { [Op.iLike]: `%${options?.searchParam || ""}%` } },
          ],
        };
      }

      searchParam.SellerId = sellerId;
      searchParam.IsFromAdmin = false;

      if (options?.statusProcess !== undefined) {
        const statusProcess = parseInt(options.statusProcess);
        switch (statusProcess) {
          case 0: // All
            break;
          case 1: // NotStarted
            searchParam.StartDate = { [Op.gt]: bdtTime.getBdDateTime() };
            searchParam.StatusId = AppConstants.StatusId.Active;
            break;
          case 2: // Ongoing
            searchParam.StartDate = { [Op.lte]: bdtTime.getBdDateTime() };
            searchParam.EndDate = { [Op.gte]: bdtTime.getBdDateTime() };
            searchParam.StatusId = AppConstants.StatusId.Active;
            break;
          case 3: // Expired
            searchParam.StartDate = { [Op.lt]: bdtTime.getBdDateTime() };
            searchParam.EndDate = { [Op.lt]: bdtTime.getBdDateTime() };
            searchParam.StatusId = AppConstants.StatusId.Active;
            break;
          case 4: // InActive (or any other status if needed)
            searchParam.StatusId = AppConstants.StatusId.InActive;
            break;
          default:
            break;
        }
      }

      const data = await db.FreeShipping.findAll({
        where: searchParam,
        order: [["Id", "DESC"]],
        offset: (page - 1) * size,
        limit: size,
        include: [
          {
            model: db.FreeShippingProducts,
            as: "FreeShippingProducts",
            attributes: ["ProductId", "ProductVariantId"],
          },
        ],
      });

      // Determine status process for each result
      const resultsWithStatusProcess = data.map((item) => {
        let StatusProcessName;
        let StatusProcessId;

        if (
          item.StatusId === AppConstants.StatusId.Active &&
          item.EndDate &&
          item.StartDate &&
          new Date(item.StartDate) < currentDate &&
          new Date(item.EndDate) < currentDate
        ) {
          StatusProcessName = "Expired";
          StatusProcessId = 3;
        } else if (
          item.StatusId === AppConstants.StatusId.Active &&
          item.StartDate &&
          new Date(item.StartDate) > currentDate
        ) {
          StatusProcessName = "Not-Started";
          StatusProcessId = 1;
        } else if (
          item.StatusId === AppConstants.StatusId.Active &&
          item.StartDate &&
          item.EndDate &&
          new Date(item.StartDate) <= currentDate &&
          new Date(item.EndDate) >= currentDate
        ) {
          StatusProcessName = "On-going";
          StatusProcessId = 2;
        } else if (item.StatusId === AppConstants.StatusId.InActive) {
          StatusProcessName = "In-Active";
          StatusProcessId = 4;
        } else {
          StatusProcessName = "Long-Term";
          StatusProcessId = 6;
        }
        return { ...item.toJSON(), StatusProcessName, StatusProcessId };
      });

      const totalCount = await db.FreeShipping.count({ where: searchParam });
      const totalPageCount = Math.ceil(totalCount / size);
      const hasNextPage = page * size < totalCount;

      return {
        pageInfo: {
          totalCount,
          size,
          page,
          totalPageCount,
          hasNextPage,
        },
        results: resultsWithStatusProcess,
      };
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  };

  async adminGetByIdFreeShippingRepository(id) {
    try {
      const getFreeShipping = await db.FreeShipping.findOne({
        where: { Id: id, IsFromAdmin: true },
      });

      if (getFreeShipping) {
        return getFreeShipping ?? {};
      }
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  }

  async getByIdFreeShippingRepository(id, sellerId) {
    try {
      const currentDate = bdtTime.getBdDateTime();

      const getFreeShipping = await db.FreeShipping.findOne({
        where: { Id: id, SellerId: sellerId, IsFromAdmin: false },
        include: [
          {
            model: db.FreeShippingProducts,
            as: "FreeShippingProducts",
          },
          {
            model: db.FreeShippingRestrictions,
            as: "FreeShippingRestrictions",
          },
        ],
      });

      if (getFreeShipping) {
        let StatusProcessName;
        let StatusProcessId;

        if (
          getFreeShipping.StatusId === AppConstants.StatusId.Active &&
          getFreeShipping.EndDate &&
          new Date(getFreeShipping.EndDate) < currentDate
        ) {
          StatusProcessName = "Expired";
          StatusProcessId = 3;
        } else if (
          getFreeShipping.StatusId === AppConstants.StatusId.Active &&
          getFreeShipping.StartDate &&
          new Date(getFreeShipping.StartDate) > currentDate
        ) {
          StatusProcessName = "Not-Started";
          StatusProcessId = 1;
        } else if (
          getFreeShipping.StatusId === AppConstants.StatusId.Active &&
          getFreeShipping.StartDate &&
          getFreeShipping.EndDate &&
          new Date(getFreeShipping.StartDate) <= currentDate &&
          new Date(getFreeShipping.EndDate) >= currentDate
        ) {
          StatusProcessName = "On-going";
          StatusProcessId = 2;
        } else if (
          getFreeShipping.StatusId === AppConstants.StatusId.InActive
        ) {
          StatusProcessName = "In-Active";
          StatusProcessId = 4;
        } else {
          StatusProcessName = "Long-Term";
          StatusProcessId = 6;
        }

        return {
          ...getFreeShipping.toJSON(),
          StatusProcessName,
          StatusProcessId,
        };
      }
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  }

  async getByIdFreeShippingProductsRepository(id, sellerId, options) {
    try {
      const productName = options?.productName;
      const sellerSku = options?.sellerSku;
      const shopSku = options?.shopSku;

      const statusId = options?.statusId ?? AppConstants.StatusId.Active;
      const page =
        parseInt(options?.page) || parseInt(process.env.PAGINATE_CURRENT_PAGE);
      let size =
        parseInt(options?.size) || parseInt(process.env.PAGINATE_PAGE_SIZE);

      let query;

      if (options?.isRes) {
        query = `SELECT * FROM product.sp_seller_get_freeShippingres_products_by_fsId(${sellerId},${id}, ${size},${page},
          ${productName ? `'${productName}'` : "NULL"},
          ${sellerSku ? `'${sellerSku}'` : "NULL"},
          ${shopSku ? `'${shopSku}'` : "NULL"},
          ${statusId})`;
      } else {
        query = `SELECT * FROM product.sp_seller_get_freeShipping_products_by_fsId(${sellerId},${id}, ${size},${page},
          ${productName ? `'${productName}'` : "NULL"},
          ${sellerSku ? `'${sellerSku}'` : "NULL"},
          ${shopSku ? `'${shopSku}'` : "NULL"},
          ${statusId})`;
      }

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        raw: true,
      });

      const jsonData = JSON.parse(JSON.stringify(result));
      const deserializedData = jsonData[0]?.Data;

      const totalCount = deserializedData?.totalRowCount || 0;
      const productData = deserializedData?.productData || [];

      const paginatedData = {
        pageInfo: {
          totalCount,
          size,
          page,
          totalPageCount: Math.ceil(totalCount / size),
          hasNextPage: page * size < totalCount,
        },
        results: productData,
      };

      return paginatedData;
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  }

  updateFreeShippingRepository = async (id, payload, sellerId, headers) => {
    const transaction = await sequelize.transaction();

    try {
      let {
        FreeShippingRestrictions,
        IsAppliedToEntireShop,
        FreeShippingProducts,
        IsLongTerm,
        ...freeShippingPayload
      } = payload;

      const restrictionsTypeId =
        FreeShippingRestrictions?.length > 0
          ? AppConstants.RestrictionType.Restriction
          : null;


      const today = bdtTime.getBdDateTime();
      let sixMonthsLater = bdtTime.getBdDateTime(today);

      if (IsLongTerm) {
        sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
        Object.assign(freeShippingPayload, {
          IsLongTerm: true,
          StartDate: today.toISOString(),
          EndDate: sixMonthsLater.toISOString(),
          CollectionStartDate: today.toISOString(),
        });
      } else {
        freeShippingPayload.IsLongTerm = false;
      }
      
      // Update FreeShipping For Customer

        await this.updateFreeShippingNewsForCustomer(
          id,
          IsAppliedToEntireShop,
          freeShippingPayload,
          sellerId,
          transaction
        );

        // update freeShipping White List Product
        
        if( IsAppliedToEntireShop == false && FreeShippingProducts && FreeShippingProducts?.length > 0){
          await db.FreeShippingNewProductWhiteLists.destroy({
            where: { ShippingVoucherId: id },
            transaction
          })

          await this.updateFreeShippingWhiteListProductForCustomer(
            id,
            FreeShippingProducts,
            sellerId,
            transaction
          );
        }

        // update freeShipping Black List Product
        if(IsAppliedToEntireShop == false && FreeShippingRestrictions && FreeShippingRestrictions?.length > 0){
          await db.FreeShippingNewProductWhiteLists.destroy({
            where: { ShippingVoucherId: id },
            transaction
          })

          await this.updateFreeShippingBlackListProductForCustomer(
            id,
            FreeShippingRestrictions,
            sellerId,
            transaction
          );
        }

      //  Update FreeShipping Record For Seller
      await db.FreeShipping.update(
        {
          ...freeShippingPayload,
          IsAppliedToEntireShop,
          FreeVoucherRefTypeId: AppConstants.FreeVoucherType.OnSellerProduct,
          RestrictionsTypeId: restrictionsTypeId,
          SellerId: sellerId,
          UpdatedBy: sellerId,
          StatusId: AppConstants.StatusId.Active,
          UpdatedAt: today,
        },
        { where: { Id: id, SellerId: sellerId }, transaction }
      );

      //  Parallel Delete Operations
      await Promise.all([
        db.FreeShippingProducts.destroy({
          where: { FreeShippingId: id },
          transaction,
        }),
        db.FreeShippingRestrictions.destroy({
          where: { FreeShippingId: id },
          transaction,
        }),
      ]);

      //  Bulk Insert FreeShippingProducts
      if (FreeShippingProducts?.length) {
        await db.FreeShippingProducts.bulkCreate(
          FreeShippingProducts.map((product) => ({
            FreeShippingId: id,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: today,
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }

      //  Bulk Insert FreeShippingRestrictions
      if (FreeShippingRestrictions?.length) {
        await db.FreeShippingRestrictions.bulkCreate(
          FreeShippingRestrictions.map((restrict) => ({
            FreeShippingId: id,
            ProductId: restrict.ProductId,
            ProductVariantId: restrict.ProductVariantId,
            CreatedAt: today,
            CreatedBy: sellerId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }

      // // ✅ Optimize Function Calls
      // await Promise.all([
      //   IsAppliedToEntireShop
      //     ? this.updateApplyFreeShippingToEntireShop(
      //         freeShippingPayload,
      //         sellerId,
      //         transaction
      //       )
      //     : this.updateApplyFreeShippingToProducts(
      //         freeShippingPayload,
      //         FreeShippingProducts,
      //         sellerId,
      //         transaction
      //       ),

      //   FreeShippingRestrictions?.length
      //     ? this.applyFreeShippingToRestrictedProducts(
      //         FreeShippingRestrictions,
      //         sellerId,
      //         transaction
      //       )
      //     : Promise.resolve(),
      // ]);

      const updatedPayload = {
        Id: id,
        Name: payload.Name,
        IsFromAdmin: payload.IsFromAdmin,
        SellerId: sellerId,
        StatusId: AppConstants.StatusId.Active,
        AdminPercent: null,
        SellerPercent: null,
      };

      // ✅ HTTP Request with Error Handling
      try {
        const URL = `${process.env.LOGISTICS_SERVER_URL}/api/FreeShipping/Update`;
        await axios.put(URL, updatedPayload, { headers });
      } catch (httpError) {
        logger.error(
          "Failed to update FreeShipping in logistics service:",
          httpError
        );
      }

      await transaction.commit();

      const updatedFreeShipping = await db.FreeShipping.findOne({
        where: { Id: id, SellerId: sellerId },
        include: [
          {
            model: db.FreeShippingProducts,
            as: 'FreeShippingProducts',
            attributes: ['ProductId', 'ProductVariantId'],
            where: { StatusId: AppConstants.StatusId.Active },
            required: false
          },
          {
            model: db.FreeShippingRestrictions,
            as: 'FreeShippingRestrictions',
            attributes: ['ProductId', 'ProductVariantId'],
            where: { StatusId: AppConstants.StatusId.Active },
            required: false
          }
        ],
      });


      return {
        updatedFreeShipping,
        isUpdated: true,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error("Error updating free shipping:", error);
      throw error;
    }
  };

  adminUpdateFreeShippingRepository = async (adminId, id, payload) => {
    const transaction = await sequelize.transaction();
    try {
      const {
        FreeVoucherRefTypeId,
        FreeShippingRestrictions,
        FreeShippingProducts,
        FreeShippingCategories,
        ...freeShippingPayload
      } = payload;

      const restrictionsTypeId =
        FreeShippingRestrictions?.length > 0
          ? AppConstants.RestrictionType.Restriction
          : null;

      //  Update FreeShipping Record
      await db.FreeShipping.update(
        {
          ...freeShippingPayload,
          FreeVoucherRefTypeId,
          RestrictionsTypeId: restrictionsTypeId,
          UpdatedBy: adminId,
          StatusId: AppConstants.StatusId.Active,
          UpdatedAt: bdtTime.getBdDateTime(),
        },
        { where: { Id: id, IsFromAdmin: true }, transaction }
      );

      //  DELETE Old Records in One Query
      await Promise.all([
        db.FreeShippingProducts.destroy({
          where: { FreeShippingId: id },
          transaction,
        }),
        db.FreeShippingProductCategories.destroy({
          where: { FreeShippingId: id },
          transaction,
        }),
        db.FreeShippingRestrictions.destroy({
          where: { FreeShippingId: id },
          transaction,
        }),
      ]);

      //  Use `bulkCreate` Instead of `map(async ...)`
      if (FreeShippingProducts?.length) {
        await db.FreeShippingProducts.bulkCreate(
          FreeShippingProducts.map((product) => ({
            FreeShippingId: id,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: adminId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }

      if (
        FreeVoucherRefTypeId === AppConstants.FreeVoucherType.CategoryType &&
        FreeShippingCategories?.length
      ) {
        await db.FreeShippingProductCategories.bulkCreate(
          FreeShippingCategories.map((categoryId) => ({
            FreeShippingId: id,
            CategoryId: categoryId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: adminId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }

      if (FreeShippingRestrictions?.length) {
        await db.FreeShippingRestrictions.bulkCreate(
          FreeShippingRestrictions.map((product) => ({
            FreeShippingId: id,
            ProductId: product.ProductId,
            ProductVariantId: product.ProductVariantId,
            CreatedAt: bdtTime.getBdDateTime(),
            CreatedBy: adminId,
            StatusId: AppConstants.StatusId.Active,
          })),
          { transaction }
        );
      }

      //  Fetch Updated Record **AFTER** Committing the Transaction
      await transaction.commit();

      return await db.FreeShipping.findOne({
        where: { Id: id, IsFromAdmin: true },
        include: [
          { model: db.FreeShippingProducts, as: "FreeShippingProducts" },
          {
            model: db.FreeShippingProductCategories,
            as: "FreeShippingProductCategories",
          },
          {
            model: db.FreeShippingRestrictions,
            as: "FreeShippingRestrictions",
          },
        ],
      });
    } catch (error) {
      await transaction.rollback();
      logger.error(error);
      throw error;
    }
  };

  checkFreeShippingStatusRepository = async (id, statusId) => {
    try {
      const isExistData = await db.FreeShipping.findOne({
        where: { Id: id, StatusId: statusId },
      });

      return isExistData;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  updateFreeShippingStatusRepository = async (id, statusId, sellerId) => {
      const transaction = await sequelize.transaction();

    try {

     const [updatedFreeShippingNews] = await db.FreeShippingNews.update(
        {
          StatusId: statusId,
          UpdatedAt: bdtTime.getBdDateTime(),
        },
        {
          where: { Id: id, SellerId: sellerId },
        },
        transaction,
      )

  if(updatedFreeShippingNews>0){
  
      const [updatedRaws, updatedFreeShipping] = await db.FreeShipping.update(
        {
          StatusId: statusId,
          UpdatedAt: bdtTime.getBdDateTime(),
        },
        {
          where: { Id: id, SellerId: sellerId },
          returning: true,
        },
        transaction

      );

      // const freeShipping = await db.FreeShipping.findOne({
      //   where: { Id: id, SellerId: sellerId },
      //   attributes: [
      //     "IsAppliedToEntireShop",
      //     "StartDate",
      //     "EndDate",
      //     "RestrictionsTypeId",
      //     "IsLongTerm",
      //   ],
      //   include: [
      //     {
      //       model: db.FreeShippingProducts,
      //       as: "FreeShippingProducts",
      //       attributes: ["ProductId"],
      //     },
      //   ],
      // });

      // // Determine new FreeShipping values based on status
      // const freeShippingValues =
      //   statusId === AppConstants.StatusId.Active
      //     ? {
      //         FreeShippingStartAt: freeShipping?.StartDate,
      //         FreeShippingEndAt: freeShipping?.EndDate,
      //         IsFreeShippingApplied: true,
      //       }
      //     : {
      //         FreeShippingStartAt: null,
      //         FreeShippingEndAt: null,
      //         IsFreeShippingApplied: false,
      //       };

      // if (freeShipping?.IsAppliedToEntireShop) {
      //   const products = await db.Product.findAll({
      //     where: { SellerId: sellerId },
      //     ApprovalStatusId: AppConstants.ApprovalStatusId.Approved,
      //   });

      //   if (freeShipping?.IsLongTerm) {
      //     await Promise.all(
      //       products.map(async (product) => {
      //         await product.update(freeShippingValues);
      //       })
      //     );
          
      //   } else {
      //     await Promise.all(
      //       products.map(async (product) => {
      //         await product.update(freeShippingValues);
      //       })
      //     );
      //   }

      // } else if (freeShipping?.RestrictionsTypeId === 1) {
      //   // Fetch FreeShippingRestriction products
      //   const freeShippingRestrictionProducts =
      //     await db.FreeShippingRestrictions.findAll({
      //       where: { FreeShippingId: id },
      //       attributes: ["ProductId"],
      //     });

      //   // Update specific products
      //   const restrictionProductIds = freeShippingRestrictionProducts.map(
      //     (product) => product.ProductId
      //   );
      //   await Promise.all(
      //     restrictionProductIds.map((restrictProductId) =>
      //       db.Product.update(freeShippingValues, {
      //         where: { Id: restrictProductId },
      //       })
      //     )
      //   );
      // } else {

      //   if (freeShipping?.IsLongTerm) {
      //     await db.Product.update(freeShippingValues, {
      //       where: {
      //         SellerId: sellerId,
      //         ApprovalStatusId: AppConstants.ApprovalStatusId.Approved,
      //       },
      //     });
      //   } else {
      //     await db.Product.update(freeShippingValues, {
      //       where: {
      //         SellerId: sellerId,
      //         ApprovalStatusId: AppConstants.ApprovalStatusId.Approved,
      //       },
      //     });
      //   }

      //   // Fetch FreeShipping products
      //   const freeShippingProducts = await db.FreeShippingProducts.findAll({
      //     where: { FreeShippingId: id },
      //     attributes: ["ProductId"],
      //   });

      //   // Update specific products
      //   const productIds = freeShippingProducts.map(
      //     (product) => product.ProductId
      //   );
      //   await Promise.all(
      //     productIds.map((productId) =>
      //       db.Product.update(freeShippingValues, {
      //         where: { Id: productId },
      //       })
      //     )
      //   );
      // }

      // await transaction.commit();
      return updatedFreeShipping;

     }   
    } catch (error) {
      transaction.rollback();
      logger.error(error);
      throw error;
    }
  };

  updateAdminFreeShippingStatusRepository = async (id, statusId) => {
    try {
      // Using Sequelize's `update` method to update the record and return the updated row count
      const [affectedRows] = await db.FreeShipping.update(
        {
          StatusId: statusId,
          UpdatedAt: bdtTime.getBdDateTime(),
        },
        {
          where: { Id: id, IsFromAdmin: true },
          returning: true, // Ensures that the updated row is returned
        }
      );

      // Check if any rows were affected (updated)
      if (affectedRows === 0) {
        return null; // No rows updated, return null
      }

      // Return the affected row count if successful
      return true;
    } catch (error) {
      logger.error(error);
      throw error; // Rethrow the error to be handled by the service layer
    }
  };

  updateFreeShippingTotalSpendAmountRepository = async (payload) => {
    try {
      const existingFreeShipping = await db.FreeShipping.findOne({
        where: { Id: payload.Id },
      });

      let updatedFreeShipping;

      if (
        existingFreeShipping.TotalSpend <
        existingFreeShipping.FreeShippingBudget
      ) {
        const newTotalSpend =
          existingFreeShipping.TotalSpend + payload.TotalSpend;

        updatedFreeShipping = await db.FreeShipping.update(
          { TotalSpend: newTotalSpend },

          { where: { Id: payload.Id } }
        );
      }

      return updatedFreeShipping;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  };

  getAllAdminFreeShippingRepository = async (options) => {
    try {
      const currentDate = bdtTime.getBdDateTime();

      const page =
        parseInt(options?.page) || parseInt(process.env.PAGINATE_CURRENT_PAGE);
      const size =
        parseInt(options?.size) || parseInt(process.env.PAGINATE_PAGE_SIZE);

      let searchParam = {};

      if (options?.searchParam) {
        searchParam = {
          [Op.or]: [
            { Name: { [Op.iLike]: `%${options?.searchParam || ""}%` } },
          ],
        };
      }

      searchParam.IsFromAdmin = true;

      if (options?.startDate) {
        searchParam.StartDate = { [Op.gte]: new Date(options.startDate) };
      }

      if (options?.endDate) {
        searchParam.EndDate = { [Op.lte]: new Date(options.endDate) };
      }

      if (options?.statusProcess !== undefined) {
        const statusProcess = parseInt(options.statusProcess);
        switch (statusProcess) {
          case 0: // All
            break;
          case 1: // NotStarted
            searchParam.StartDate = { [Op.gt]: bdtTime.getBdDateTime() };
            searchParam.StatusId = AppConstants.StatusId.Active;
            break;
          case 2: // Ongoing
            searchParam.StartDate = { [Op.lte]: bdtTime.getBdDateTime() };
            searchParam.EndDate = { [Op.gte]: bdtTime.getBdDateTime() };
            searchParam.StatusId = AppConstants.StatusId.Active;
            break;
          case 3: // Expired
            searchParam.StartDate = { [Op.lt]: bdtTime.getBdDateTime() };
            searchParam.EndDate = { [Op.lt]: bdtTime.getBdDateTime() };
            searchParam.StatusId = AppConstants.StatusId.Active;
            break;
          case 4: // InActive (or any other status if needed)
            searchParam.StatusId = AppConstants.StatusId.InActive;
            break;
          default:
            break;
        }
      }

      const data = await db.FreeShipping.findAll({
        where: searchParam,
        order: [["Id", "DESC"]],
        offset: (page - 1) * size,
        limit: size,
        // include: [
        //   {
        //     model: db.FreeShippingProducts,
        //     as: "FreeShippingProducts",
        //     attributes: ["ProductId", "ProductVariantId"],
        //   },
        //   {
        //     model: db.FreeShippingProductCategories,
        //     as: "FreeShippingProductCategories",
        //     attributes: ["CategoryId"],
        //   },
        //   {
        //     model: db.FreeShippingRestrictions,
        //     as: "FreeShippingRestrictions",
        //     attributes: ["ProductId", "ProductVariantId"],
        //   },
        // ],
      });

      // Determine status process for each result
      const resultsWithStatusProcess = data.map((item) => {
        let StatusProcessName;
        let StatusProcessId;

        if (
          item.StatusId === AppConstants.StatusId.Active &&
          item.EndDate &&
          item.StartDate &&
          new Date(item.StartDate) < currentDate &&
          new Date(item.EndDate) < currentDate
        ) {
          StatusProcessName = "Expired";
          StatusProcessId = 3;
        } else if (
          item.StatusId === AppConstants.StatusId.Active &&
          item.StartDate &&
          new Date(item.StartDate) > currentDate
        ) {
          StatusProcessName = "Not-Started";
          StatusProcessId = 1;
        } else if (
          item.StatusId === AppConstants.StatusId.Active &&
          item.StartDate &&
          item.EndDate &&
          new Date(item.StartDate) <= currentDate &&
          new Date(item.EndDate) >= currentDate
        ) {
          StatusProcessName = "On-going";
          StatusProcessId = 2;
        } else if (item.StatusId === AppConstants.StatusId.InActive) {
          StatusProcessName = "In-Active";
          StatusProcessId = 4;
        } else {
          StatusProcessName = "Long-Term";
          StatusProcessId = 6;
        }
        return { ...item.toJSON(), StatusProcessName, StatusProcessId };
      });

      const totalCount = await db.FreeShipping.count({ where: searchParam });
      const totalPageCount = Math.ceil(totalCount / size);
      const hasNextPage = page * size < totalCount;

      return {
        pageInfo: {
          totalCount,
          size,
          page,
          totalPageCount,
          hasNextPage,
        },
        results: resultsWithStatusProcess,
      };
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  };

  async getByIdAdminFreeShippingRepository(id) {
    try {
      const getFreeShipping = await db.FreeShipping.findOne({
        where: { Id: id, IsFromAdmin: true },
        include: [
          {
            model: db.FreeShippingProducts,
            as: "FreeShippingProducts",
          },
          {
            model: db.FreeShippingProductCategories,
            as: "FreeShippingProductCategories",
          },
          {
            model: db.FreeShippingRestrictions,
            as: "FreeShippingRestrictions",
          },
        ],
      });

      if (getFreeShipping) {
        return getFreeShipping ?? {};
      }
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  }

  //start apply freeshipping....
  updateFreeShippingApplyOnCustomerOrderRepository = async (payloads) => {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      let isProductFSRemoved = false;
      const fsIds = [];

      const freeShippingIds = payloads.map((payload) => payload.freeShippingId);

      // Fetch all relevant FreeShipping records with a lock
      const existingFreeShipping = await db.FreeShipping.findAll({
        where: { Id: { [Op.in]: freeShippingIds } },
      });

      const existingFreeShippingMap = new Map(
        existingFreeShipping.map((freeShipping) => [
          freeShipping.Id,
          freeShipping,
        ])
      );

      const updatePromises = payloads.map(async (payload) => {
        const { freeShippingId, spentForFreeShipping, customerId } = payload;
        const freeShipping = existingFreeShippingMap.get(freeShippingId);

        if (!freeShipping) return; // Skip if freeShipping record not found

        // Parse values as numbers
        const TotalSpent = parseFloat(freeShipping.TotalSpent) || 0;
        const FreeShippingBudget =
          parseFloat(freeShipping.FreeShippingBudget) || 0;
        const newSpentForFreeShipping =
          TotalSpent + parseFloat(spentForFreeShipping);

        if (newSpentForFreeShipping <= FreeShippingBudget) {
          // Update FreeShipping's TotalSpent if under budget
          await db.FreeShipping.update(
            { TotalSpent: newSpentForFreeShipping },
            { where: { Id: freeShippingId }, transaction }
          );
        }

        // If TotalSpent equals FreeShippingBudget, apply free shipping updates
        if (newSpentForFreeShipping >= FreeShippingBudget) {
          isProductFSRemoved = true; // Indicate free shipping was applied
          fsIds.push(freeShippingId);

          const products = await this.getProductsByFreeShippingId(
            freeShippingId,
            transaction
          );
          await this.applyFreeShipping(
            freeShipping.SellerId,
            freeShipping.FreeVoucherRefTypeId,
            products,
            freeShippingId,
            freeShipping.IsAppliedToEntireShop,
            freeShipping.StartDate,
            freeShipping.EndDate,
            transaction
          );
        }
      });

      await Promise.all(updatePromises);
      await transaction.commit();

      return {
        isSuccess: true,
        isProductFSRemoved,
        fsIds,
      };
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
      logger.error(
        "Error in updateFreeShippingApplyOnCustomerOrderRepository:",
        err
      );
      return false;
    }
  };

  getProductsByFreeShippingId = async (freeShippingId, transaction) => {
    // Assuming there's a table `FreeShippingProducts` that links FreeShipping to Products
    const freeShippingProducts = await db.FreeShippingProducts.findAll({
      where: { FreeShippingId: freeShippingId },
      attributes: ["ProductId"],
    });

    const productIds = freeShippingProducts.map((fsp) => fsp.ProductId);

    if (productIds.length === 0) return [];
    return productIds;
  };

  // Apply Free Shipping to Seller Products or Specific Products
  applyFreeShipping = async (
    sellerId,
    freeVoucherRefTypeId,
    products,
    freeShippingId,
    isAppliedToEntireShop,
    StartDate,
    EndDate,
    transaction
  ) => {
    switch (freeVoucherRefTypeId) {
      case AppConstants.FreeVoucherType.OnSellerProduct:
        if (isAppliedToEntireShop) {
          await this.applyFreeShippingToEntireShop(
            StartDate,
            EndDate,
            sellerId,
            transaction
          );
        } else {
          await this.applyFreeShippingToProducts(
            StartDate,
            EndDate,
            products,
            sellerId,
            transaction
          );
        }
        break;
      case AppConstants.FreeVoucherType.OnAnyProduct:
        await this.applyFreeShippingToAnyProducts(
          StartDate,
          EndDate,
          products,
          sellerId,
          transaction
        );
        break;
      case AppConstants.FreeVoucherType.CategoryType:
        await this.applyFreeShippingByCategory(
          StartDate,
          EndDate,
          freeShippingId,
          transaction
        );
        break;
      default:
        throw new Error(
          `Unknown FreeVoucherRefTypeId: ${freeVoucherRefTypeId}`
        );
    }
  };

  // Case 1: Apply Free Shipping to Entire Shop
  applyFreeShippingToEntireShopRemoveProductInfo = async (
    sellerId,
    transaction
  ) => {
    await db.Product.update(
      {
        FreeShippingStartAt: null,
        FreeShippingEndAt: null,
        IsFreeShippingApplied: false,
      },
      {
        where: {
          SellerId: sellerId,
          ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
        },
        transaction,
      }
    );
  };

  // Case 2: Apply Free Shipping to Specific Products
  applyFreeShippingToAnyProducts = async (
    StartDate,
    EndDate,
    products,
    transaction
  ) => {
    await db.Product.update(
      {
        FreeShippingStartAt: StartDate,
        FreeShippingEndAt: EndDate,
        IsFreeShippingApplied: true,
      },
      {
        where: {
          Id: { [Op.in]: products },
          ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
        },
        transaction,
      }
    );
  };

  // Case 3: Apply Free Shipping by Category Type
  applyFreeShippingByCategory = async (
    StartDate,
    EndDate,
    freeShippingId,
    transaction
  ) => {
    // Fetch category IDs associated with this FreeShippingId
    const freeShippingCategories =
      await db.FreeShippingProductCategories.findAll({
        where: { FreeShippingId: freeShippingId },
        attributes: ["CategoryId"],
      });

    const categoryIds = freeShippingCategories.map(
      (category) => category.CategoryId
    );

    if (categoryIds.length > 0) {
      await db.Product.update(
        {
          FreeShippingStartAt: StartDate,
          FreeShippingEndAt: EndDate,
          IsFreeShippingApplied: true,
        },
        {
          where: {
            CategoryId: { [Op.in]: categoryIds },
            ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved,
          },
          transaction,
        }
      );
    }
  };

  cancelFreeShippingApplyOnCustomerOrderRepository = async (payloads) => {
    let transaction;

    try {
      transaction = await sequelize.transaction();
      let isProductFSRestored = false;
      const fsIds = [];

      const freeShippingIds = payloads.map((payload) => payload.freeShippingId);

      // Fetch all relevant FreeShipping records with a lock
      const existingFreeShipping = await db.FreeShipping.findAll({
        where: { Id: { [Op.in]: freeShippingIds } },
      });

      const existingFreeShippingMap = new Map(
        existingFreeShipping.map((freeShipping) => [
          freeShipping.Id,
          freeShipping,
        ])
      );

      const cancelPromises = payloads.map(async (payload) => {
        const { freeShippingId, spentForFreeShipping, customerId } = payload;
        const freeShipping = existingFreeShippingMap.get(freeShippingId);

        if (!freeShipping) return;

        // Parse values as numbers
        const TotalSpent = parseFloat(freeShipping.TotalSpent) || 0;
        const FreeShippingBudget =
          parseFloat(freeShipping.FreeShippingBudget) || 0;

        const newTotalSpent = TotalSpent - parseFloat(spentForFreeShipping);

        // Update the FreeShipping's TotalSpent
        if (newTotalSpent <= FreeShippingBudget) {
          await db.FreeShipping.update(
            { TotalSpent: newTotalSpent },
            { where: { Id: freeShippingId }, transaction }
          );
        }

        if (newTotalSpent < FreeShippingBudget) {
          isProductFSRestored = true; // Indicate free shipping was removed
          fsIds.push(freeShippingId);

          const products = await this.getProductsByFreeShippingId(
            freeShippingId,
            transaction
          );
          await this.applyFreeShipping(
            freeShipping.SellerId,
            freeShipping.FreeVoucherRefTypeId,
            products,
            freeShippingId,
            freeShipping.IsAppliedToEntireShop,
            freeShipping.StartDate,
            freeShipping.EndDate,
            transaction
          );
        }
      });

      await Promise.all(cancelPromises);
      await transaction.commit();

      return {
        isSuccess: true,
        isProductFSRestored,
        fsIds,
      };
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }
      logger.error(
        "Error in cancelFreeShippingForCustomerOrderRepository:",
        err
      );
      return false;
    }
  };

  getFreeShippingAndVoucherDetailsRepository = async (payloads) => {
    try {
      const FreeShippingId = payloads?.FreeShippingId || "null";
      const VoucherId = payloads?.VoucherId || "null";

      const query = `SELECT * FROM seller.sp_seller_get_free_shipping_and_voucher_detailsV1(${FreeShippingId}, ${VoucherId})`;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        raw: true,
      });

      const jsonData = JSON.parse(JSON.stringify(result));
      const deserializedData = jsonData[0]?.Data || {};

      const freeShippingData = deserializedData.FreeShipping
        ? deserializedData.FreeShipping[0]
        : null;
      const voucherData = deserializedData.Voucher
        ? deserializedData.Voucher[0]
        : null;

      return {
        freeShippingData,
        voucherData,
      };
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  };

  getFreeShippingDetailsForRedisCacheClean = async (id) => {
    try {
      const data = await db.FreeShipping.findOne({
        where: {
          Id: id,
          IsFromAdmin: false,
          StatusId: AppConstants.StatusId.Active,
        },

        attributes: ["IsAppliedToEntireShop"],

        include: [
          {
            model: db.FreeShippingProducts,
            as: "FreeShippingProducts",
            attributes: ["ProductId"],
          },
        ],
      });

      return data;
    } catch (error) {
      logger.error("Error occurred:", error);
      throw error;
    }
  };

  // =======================================================
  // =======Start Apply FreeShipping On Customer Order======
  // =======================================================
  updateApplyFreeShippingOnCustomerOrderV2 = async (payloads) => {
    try {
      let isProductFSRemoved = false;
      const fsIds = new Set();

      // Group spent amounts by freeShippingId
      const spentByFreeShippingId = payloads.reduce(
        (acc, { freeShippingId, spentForFreeShipping }) => {
          acc[freeShippingId] =
            (acc[freeShippingId] || 0) + spentForFreeShipping;
          return acc;
        },
        {}
      );

      const freeShippingIds = Object.keys(spentByFreeShippingId);

      // Fetch all FreeShipping data in one query
      const freeShippingData = await db.FreeShipping.findAll({
        where: { Id: freeShippingIds },
        attributes: [
          "Id",
          "TotalSpent",
          "FreeShippingBudget",
          "SellerId",
          "FreeVoucherRefTypeId",
          "IsAppliedToEntireShop",
          "StartDate",
          "EndDate",
        ],
      });

      const freeShippingMap = new Map(
        freeShippingData.map((fs) => [fs.Id, fs])
      );

      const updatePromises = [];

      for (const [freeShippingId, additionalSpent] of Object.entries(
        spentByFreeShippingId
      )) {
        const freeShipping = freeShippingMap.get(Number(freeShippingId));
        if (!freeShipping) continue;

        const newTotalSpent = Math.round(
          (parseFloat(freeShipping.TotalSpent) || 0) + additionalSpent
        );

        if (newTotalSpent <= freeShipping.FreeShippingBudget) {
          updatePromises.push(
            db.FreeShipping.update(
              { TotalSpent: newTotalSpent },
              { where: { Id: freeShippingId } }
            )
          );
        } else {
          isProductFSRemoved = true;
          fsIds.add(freeShippingId);

          const products = await this.getProductsByFreeShippingIdV2(
            freeShippingId
          );
          await this.applyFreeShippingV2(freeShipping, products);
        }
      }

      await Promise.all(updatePromises);

      return { isSuccess: true, isProductFSRemoved, fsIds: Array.from(fsIds) };
    } catch (err) {
      logger.error("Error in updateFreeShippingOnCustomerOrderV2:", err);
      return { isSuccess: false, error: err.message };
    }
  };

  getProductsByFreeShippingIdV2 = async (freeShippingId) => {
    const freeShippingProducts = await db.FreeShippingProducts.findAll({
      where: { FreeShippingId: freeShippingId },
      attributes: ["ProductId"],
    });
    return freeShippingProducts.map(({ ProductId }) => ProductId);
  };

  applyFreeShippingV2 = async (freeShipping, products) => {
    const transaction = await sequelize.transaction();
    try {
      switch (freeShipping.FreeVoucherRefTypeId) {
        case AppConstants.FreeVoucherType.OnSellerProduct:
          if (freeShipping.IsAppliedToEntireShop) {
            await this.applyFreeShippingToEntireShop2V2(
              freeShipping,
              transaction
            );
          } else {
            await this.applyFreeShippingToProductsV2(
              freeShipping,
              products,
              transaction
            );
          }
          break;
        case AppConstants.FreeVoucherType.OnAnyProduct:
          await this.applyFreeShippingToProductsV2(
            freeShipping,
            products,
            transaction
          );
          break;
        case AppConstants.FreeVoucherType.CategoryType:
          await this.applyFreeShippingByCategory2(freeShipping, transaction);
          break;
        default:
          throw new Error(
            `Unknown FreeVoucherRefTypeId: ${freeShipping.FreeVoucherRefTypeId}`
          );
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      logger.error("Error in applyFreeShippingV2:", error);
      throw error;
    }
  };

  applyFreeShippingToEntireShop2V2 = async (freeShipping, transaction) => {
    await db.Product.update(
      {
        FreeShippingStartAt: null,
        FreeShippingEndAt: null,
        IsFreeShippingApplied: false,
      },
      { where: { SellerId: freeShipping.SellerId }, transaction }
    );
  };

  applyFreeShippingToProductsV2 = async (
    freeShipping,
    products,
    transaction
  ) => {
    if (!products.length) return;
    await db.Product.update(
      {
        FreeShippingStartAt: null,
        FreeShippingEndAt: null,
        IsFreeShippingApplied: false,
      },
      { where: { Id: products }, transaction }
    );
  };

  applyFreeShippingByCategory2 = async (freeShipping, transaction) => {
    const categoryIds = await db.FreeShippingProductCategories.findAll({
      where: { FreeShippingId: freeShipping.Id },
      attributes: ["CategoryId"],
    }).then((data) => data.map(({ CategoryId }) => CategoryId));

    if (!categoryIds.length) return;
    await db.Product.update(
      {
        FreeShippingStartAt: null,
        FreeShippingEndAt: null,
        IsFreeShippingApplied: false,
      },
      { where: { CategoryId: categoryIds }, transaction }
    );
  };

  // =======================================================
  // =======End ApplyFreeShippingOnCustomerOrder==========
  // =======================================================

  // =======================================================
  // =======Start Cancel FreeShipping On CustomerOrder==========
  // =======================================================

  updateCancelFreeShippingOnCustomerOrderV2 = async (payloads) => {
    try {
      let isProductFSRemoved = false;
      const fsIds = new Set();

      // Group spent amounts by freeShippingId
      const spentByFreeShippingId = payloads.reduce(
        (acc, { freeShippingId, spentForFreeShipping }) => {
          acc[freeShippingId] =
            (acc[freeShippingId] || 0) + spentForFreeShipping;
          return acc;
        },
        {}
      );

      const freeShippingIds = Object.keys(spentByFreeShippingId);

      // Fetch all FreeShipping data in one query
      const freeShippingData = await db.FreeShipping.findAll({
        where: { Id: freeShippingIds },
        attributes: ["Id", "TotalSpent", "FreeShippingBudget"],
      });

      const freeShippingMap = new Map(
        freeShippingData.map((fs) => [fs.Id, fs])
      );

      const updatePromises = [];

      for (const [freeShippingId, deductedSpent] of Object.entries(
        spentByFreeShippingId
      )) {
        const freeShipping = freeShippingMap.get(Number(freeShippingId));
        if (!freeShipping) continue;

        // Ensure new TotalSpent does not go below zero
        const newTotalSpent = Math.max(
          0,
          (parseFloat(freeShipping.TotalSpent) || 0) - deductedSpent
        );

        updatePromises.push(
          db.FreeShipping.update(
            { TotalSpent: newTotalSpent },
            { where: { Id: freeShippingId } }
          )
        );

        // if (newTotalSpent == freeShipping.TotalSpent) {
        //     isProductFSRemoved = true;
        //     fsIds.add(freeShippingId);
        // }
      }

      await Promise.all(updatePromises);

      return { isSuccess: true, isProductFSRemoved, fsIds: [] };
    } catch (err) {
      logger.error("Error in updateFreeShippingOnCustomerOrderV2:", err);
      return { isSuccess: false, error: err.message };
    }
  };

  // =======================================================
  // =======End Cancel FreeShipping On CustomerOrder==========
  // =======================================================

  async createBulkFreeShippingStickerRepository(stickersToInsert) {
    try {
      if (!stickersToInsert?.length) return [];

      return await db.FreeShippingSticker.bulkCreate(stickersToInsert, {
        validate: true,
        returning: true
      });
    } catch (err) {
      logger.error('Error in createBulkFreeShippingStickerRepository', err);
      throw err;
    }
  }

  async enableFreeShippingByScheduleRepository(freeShippingId, productIds, startDate, endDate) {
    try {
      await db.Product.update(
        {
          FreeShippingStartAt: startDate,
          FreeShippingEndAt: endDate,
          StatusId: AppConstants.FreeShippingStickerStatus.Active,
          IsFreeShippingApplied: true
        },
        { where: { Id: { [Op.in]: productIds } } }
      );
      logger.info(`✅ Enabled Free Shipping for ProductId=${freeShippingId}`);
    } catch (err) {
      logger.error('Error in enableFreeShippingByScheduleRepository', err);
    }
  }

  async disableFreeShippingByScheduleRepository(freeShippingId, productIds) {
    try {
      await db.Product.update(
        {
          FreeShippingStartAt: null,
          FreeShippingEndAt: null,
          StatusId: AppConstants.FreeShippingStickerStatus.Inactive,
          IsFreeShippingApplied: false
        },
        { where: { Id: { [Op.in]: productIds } } }
      );
      logger.info(`✅ Disabled Free Shipping for ProductId=${freeShippingId}`);
    } catch (err) {
      logger.error('Error in disableFreeShippingByScheduleRepository', err);
    }
  }

  async findFreeShippingByIdRepository(freeShippingId) {
    try {
      return await db.FreeShipping.findOne({
        where: {
          Id: freeShippingId
        },
        attributes: ['Id', 'IsAppliedToEntireShop', 'RestrictionsTypeId', 'SellerId'],
        raw: true
      });
    } catch (err) {
      logger.error('Error in findFreeShippingByIdRepository', err);
      throw err;
    }
  }

  async findFreeShippingRestrictionsRepository(freeShippingId) {
    try {
      return await db.FreeShippingRestrictions.findAll({
        where: { FreeShippingId: freeShippingId },
        attributes: ['ProductId'],
        raw: true
      });
    } catch (err) {
      logger.error('Error in findFreeShippingRestrictionsRepository', err);
      throw err;
    }
  }

  async findFreeShippingProductsRepository(freeShippingId) {
    try {
      return await db.FreeShippingProducts.findAll({
        where: { FreeShippingId: freeShippingId },
        attributes: ['ProductId'],
        raw: true
      });
    } catch (err) {
      logger.error('Error in findFreeShippingProductsRepository', err);
      throw err;
    }
  }

  async findProductsForFreeShippingRepository(sellerId, productIds = null, excludeProductIds = null) {
    try {
      const whereClause = {
        SellerId: sellerId,
        ApprovalStatusId: AppConstants.AdminApprovalStatusId.Approved
      };

      if (productIds) {
        whereClause.Id = { [Op.in]: productIds };
      }

      if (excludeProductIds) {
        whereClause.Id = { [Op.notIn]: excludeProductIds };
      }

      return await db.Product.findAll({
        where: whereClause,
        include: [
          {
            model: db.ProductVariant,
            as: 'ProductVariants',
            attributes: ['Id'],
            required: false
          }
        ],
        attributes: ['Id', 'FreeShippingStartAt', 'FreeShippingEndAt', 'IsFreeShippingApplied'],
        raw: true
      });
    } catch (err) {
      logger.error('Error in findProductsForFreeShippingRepository', err);
      throw err;
    }
  }

  async updateProductFreeShippingRepository(productId, sellerId, updateData) {
    try {
      return await db.Product.update(updateData, {
        where: {
          Id: productId,
          SellerId: sellerId
        }
      });
    } catch (err) {
      logger.error('Error in updateProductFreeShippingRepository', err);
      throw err;
    }
  }
}

module.exports = FreeShippingRepository;
