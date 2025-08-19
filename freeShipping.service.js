require("dotenv").config();
const httpStatus = require("http-status");
const ApiError = require("../../errors/ErrorHandler");
const FreeShippingRepository = require("../../repository/shipping/freeShipping.repository");
const AppConstants = require("../../utils/appConstants");
const TOPIC = require("../../utils/apacheKafka/kafkaTopicManager");
const KafkaProducerService = require("../../utils/apacheKafka/kafkaProducerService");
const kafkaProducer = new KafkaProducerService();
const axios = require("axios");
const freeShippingStickerQueue = require("../../bullQueue/freeShippingStickerQueue");
const logger = require("../../logger/winston");

class FreeShippingService extends FreeShippingRepository {
  async CreateFreeShippingServices(data, sellerId, authToken, next) {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      };

      const createdFreeShipping = await this.CreateFreeShippingRepository(
        data,
        sellerId,
        headers
      );

    let produceFreeShipping = {
        Id: createdFreeShipping.Id,
        StartDate: createdFreeShipping.StartDate,
        EndDate: createdFreeShipping.EndDate,
        IsAppliedToEntireShop: createdFreeShipping.IsAppliedToEntireShop,
        StatusId: createdFreeShipping.StatusId,
        IsFromAdmin: createdFreeShipping.IsFromAdmin,
        Method: "CREATE"

      };

      if(createdFreeShipping) {
        await kafkaProducer.produceAsync(
          TOPIC.CREATE_FREE_SHIPPING_PRODUCE_TOPIC,
          createdFreeShipping
        )

        await kafkaProducer.produceAsync(
          TOPIC.FREE_SHIPPING_PRODUCE_TOPIC,
          produceFreeShipping
        )
      }

      return createdFreeShipping;
    } catch (err) {
      next(err);
    }
  }

  async UpdateFreeShippingServices(id, data, sellerId, authToken, next) {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      };

      const { isUpdated, updatedFreeShipping } = await this.updateFreeShippingRepository(
        id,
        data,
        sellerId,
        headers
      );

    if(updatedFreeShipping){

        const getFreeShippingData =
                await this.getByIdFreeShippingRepository(id, sellerId);

        let produceFreeShipping = {
              Id: getFreeShippingData.Id,
              StartDate: getFreeShippingData.StartDate,
              EndDate: getFreeShippingData.EndDate,
              IsAppliedToEntireShop: getFreeShippingData.IsAppliedToEntireShop,
              StatusId: getFreeShippingData.StatusId,
              IsFromAdmin: getFreeShippingData.IsFromAdmin,
              Method: "UPDATE"
            }
        
        await kafkaProducer.produceAsync(
          TOPIC.FREE_SHIPPING_PRODUCE_TOPIC,
          produceFreeShipping
        )
      
        return updatedFreeShipping;

      }
    } catch (err) {
      next(err);
    }
  }

  async adminCreateFreeShippingServices(data, adminId, authToken, next) {
    try {
      const headers = {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      };

      const createdFreeShipping = await this.adminCreateFreeShippingRepository(
        data,
        adminId,
        headers
      );

      return createdFreeShipping;
    } catch (err) {
      next(err);
    }
  }

  async adminUpdateFreeShippingServices(adminId, id, data, authToken, next) {
    try {
      const updatedFreeShipping = await this.adminUpdateFreeShippingRepository(
        adminId,
        id,
        data
      );

      if (updatedFreeShipping) {
        // prepare the updatedPayload
        const updatedPayload = {
          Id: updatedFreeShipping.Id,
          Name: updatedFreeShipping.Name,
          IsFromAdmin: updatedFreeShipping.IsFromAdmin,
          SellerId: updatedFreeShipping.SellerId,
          StatusId: updatedFreeShipping.StatusId,
          AdminPercent: updatedFreeShipping.AdminPercent || null,
          SellerPercent: updatedFreeShipping.SellerPercent || null,
        };

        const headers = {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        };

        const URL = `${process.env.LOGISTICS_SERVER_URL}/api/FreeShipping/Update`;

        //  HTTP PUT request to the logistic service
        await axios.put(URL, updatedPayload, { headers });

        return updatedFreeShipping;
      }
    } catch (err) {
      next(err);
    }
  }

  async UpdateAdminFreeShippingStatusServices(id, statusId, authToken, next) {
    try {
      const isExist = await this.checkFreeShippingStatusRepository(
        id,
        statusId
      );

      if (isExist && isExist.StatusId === AppConstants.StatusId.Active) {
        return next(
          new ApiError(
            "FreeShipping is already active.",
            httpStatus.BAD_REQUEST
          )
        );
      } else if (
        isExist &&
        isExist.StatusId === AppConstants.StatusId.InActive
      ) {
        return next(
          new ApiError(
            "FreeShipping is already In-Active.",
            httpStatus.BAD_REQUEST
          )
        );
      } else if (isExist && isExist.StatusId === AppConstants.StatusId.Delete) {
        return next(
          new ApiError(
            "FreeShipping is already Deleted.",
            httpStatus.BAD_REQUEST
          )
        );
      } else {
        const updatedFreeShippingStatus =
          await this.updateAdminFreeShippingStatusRepository(id, statusId);

        if (updatedFreeShippingStatus) {
          const updatedFreeShipping =
            await this.adminGetByIdFreeShippingRepository(id);

            produceFreeShipping = {
              Id: updatedFreeShipping.Id,
              StartDate: updatedFreeShipping.StarDate,
              EndDate: updatedFreeShipping.EndDate,
              IsAppliedToEntireShop: updatedFreeShipping.IsAppliedToEntireShop,
              StatusId: updatedFreeShipping.StatusId
            }

          if (updatedFreeShipping) {
            await kafkaProducer.produceAsync(
              TOPIC.FREE_SHIPPING_PRODUCE_TOPIC,
              produceFreeShipping
            )
          }

          if (updatedFreeShipping) {
            // prepare the updatedPayload
            const updatedPayload = {
              Id: updatedFreeShipping.Id,
              StatusId: updatedFreeShipping.StatusId,
            };

            const headers = {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            };

            const URL = `${process.env.LOGISTICS_SERVER_URL}/api/FreeShipping/ActiveOrInActiveOrDelete?id=${updatedPayload.Id}&statusId=${updatedPayload.StatusId}`;

            //  HTTP PUT request to the logistic service
            await axios.put(URL, updatedPayload, { headers });
          }
          return updatedFreeShipping;
        }
      }
    } catch (err) {
      next(err);
    }
  }

  async GetAllFreeShippingServices(sellerId, query, next) {
    try {
      const getAllFreeShipping = await this.getAllFreeShippingRepository(
        sellerId,
        query
      );

      if (getAllFreeShipping) {
        return getAllFreeShipping;
      }
    } catch (err) {
      next(err);
    }

    
  }

  async GetByIdFreeShippingService(id, sellerId, next) {
    try {
      const getFreeShipping = await this.getByIdFreeShippingRepository(
        id,
        sellerId
      );

      if (getFreeShipping) {
        return getFreeShipping;
      }
    } catch (err) {
      next(err);
    }
  }


  async GetByIdFreeShippingProductsService(id, sellerId, query, next) {
    try {
      const getFreeShipping = await this.getByIdFreeShippingProductsRepository(
        id,
        sellerId,
          query
      );

      if (getFreeShipping) {
        return getFreeShipping;
      }
    } catch (err) {
      next(err);
    }
  }

  async UpdateFreeShippingStatusServices(
    id,
    statusId,
    sellerId,
    authToken,
    next
  ) {
    try {
      const updatedFreeShippingStatus =
        await this.updateFreeShippingStatusRepository(id, statusId, sellerId);

    let produceFreeShipping = {
        Id: updatedFreeShippingStatus[0].dataValues.Id,
        StartDate: updatedFreeShippingStatus[0].dataValues.StartDate,
        EndDate: updatedFreeShippingStatus[0].dataValues.EndDate,
        IsAppliedToEntireShop: updatedFreeShippingStatus[0].dataValues.IsAppliedToEntireShop,
        StatusId: updatedFreeShippingStatus[0].dataValues.StatusId,
        IsFromAdmin: updatedFreeShippingStatus[0].dataValues.IsFromAdmin,
        Method: "UPDATE"

      };

      if (updatedFreeShippingStatus) {
        await kafkaProducer.produceBatchAsync(
          TOPIC.MODIFY_FREE_SHIPPING_STATUS_PRODUCE_TOPIC,
          updatedFreeShippingStatus
        );

        await kafkaProducer.produceAsync(
          TOPIC.FREE_SHIPPING_PRODUCE_TOPIC,
          produceFreeShipping
        )

        // prepare the updatedPayload
        const updatedPayload = {
          Id: updatedFreeShippingStatus[0].dataValues.Id,
          StatusId: updatedFreeShippingStatus[0].dataValues.StatusId,
        };

        const headers = {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        };

        const URL = `${process.env.LOGISTICS_SERVER_URL}/api/FreeShipping/ActiveOrInActiveOrDelete?id=${updatedPayload.Id}&statusId=${updatedPayload.StatusId}`;
        // Make the HTTP PUT request to the logistic service
        await axios.put(URL, updatedPayload, { headers });

        return updatedFreeShippingStatus;
      }
    } catch (err) {
      next(err);
    }
  }

  async updateFreeShippingTotalSpendAmountServices(data, next) {
    try {
      const payload = JSON.parse(data);

      const updateFreeShipping =
        await this.updateFreeShippingTotalSpendAmountRepository(payload);

      if (updateFreeShipping > 0) {
        return updateFreeShipping;
      }
    } catch (err) {
      next(err);
    }
  }

  async GetAllAdminFreeShippingServices(query, next) {
    try {
      const getAllAdminFreeShipping =
        await this.getAllAdminFreeShippingRepository(query);

      if (getAllAdminFreeShipping) {
        return getAllAdminFreeShipping;
      }
    } catch (err) {
      next(err);
    }
  }

  async GetByIdAdminFreeShippingService(id, next) {
    try {
      const getFreeShipping = await this.getByIdAdminFreeShippingRepository(id);

      if (getFreeShipping) {
        return getFreeShipping;
      }
    } catch (err) {
      next(err);
    }
  }

  async updateFreeShippingApplyOnCustomerOrderServices(data, next) {
    try {
      const updateFS =
        await this.updateApplyFreeShippingOnCustomerOrderV2(data);
        // await this.updateFreeShippingApplyOnCustomerOrderRepository(data);

      if (updateFS.isProductFSRemoved) {
        await kafkaProducer.produceAsync(
          TOPIC.MODIFY_FREE_SHIPPING_APPLY_ON_CUSTOMER_ORDER_PRODUCE_TOPIC,
          updateFS
        );
      }

      return updateFS;
    } catch (err) {
      next(err);
    }
  }

  async cancelFreeShippingApplyOnCustomerOrderServices(data, next) {
    try {
      const updateFS =
        await this.updateCancelFreeShippingOnCustomerOrderV2(data);
        // await this.cancelFreeShippingApplyOnCustomerOrderRepository(data);

      // if (updateFS.isProductFSRestored) {
      //   await kafkaProducer.produceAsync(
      //     TOPIC.CANCEL_FREE_SHIPPING_APPLY_ON_CUSTOMER_ORDER_PRODUCE_TOPIC,
      //     updateFS
      //   );
      // }

      return updateFS;
    } catch (err) {
      next(err);
    }
  }

  async getFreeShippingAndVoucherDetailsServices(data, next) {
    try {
      const getData = await this.getFreeShippingAndVoucherDetailsRepository(
        data
      );

      return getData;
    } catch (err) {
      next(err);
    }
  }


  async freeShippingStickerManagementServices(data) {
    try {
      const parsedData = JSON.parse(data);

      if (!parsedData.StartDate || !parsedData.EndDate) {
        logger.error('Start Date and End Date are required');
        return false;
      }

      const freeShippingId = parsedData.Id;
      const startDate = new Date(parsedData.StartDate);
      const endDate = new Date(parsedData.EndDate);

      const freeShipping = await this.findFreeShippingByIdRepository(freeShippingId);
      const { IsAppliedToEntireShop, RestrictionsTypeId } = freeShipping;

      let productsForFreeShippingSticker = [];

      // Case 1: Entire shop + Restrictions
      if (IsAppliedToEntireShop && RestrictionsTypeId === 1) {
        const freeShippingRestrictionsIds = await this.findFreeShippingRestrictionsRepository(freeShippingId);

        productsForFreeShippingSticker = await this.findProductsForFreeShippingRepository(
          freeShipping.SellerId,
          null,
          freeShippingRestrictionsIds.map((r) => r.ProductId)
        );

        // Case 2: Selected products + Restrictions
      } else if (!IsAppliedToEntireShop && RestrictionsTypeId === 1) {
        const freeShippingProducts = await this.findFreeShippingProductsRepository(freeShippingId);

        productsForFreeShippingSticker = await this.findProductsForFreeShippingRepository(
          freeShipping.SellerId,
          freeShippingProducts.map((product) => product.ProductId),
          null
        );

        // Case 3: Selected products + No restrictions
      } else {
        productsForFreeShippingSticker = await this.findProductsForFreeShippingRepository(freeShipping.SellerId);
      }

      if (productsForFreeShippingSticker.length === 0) {
        logger.error('Products for free shipping sticker is not found');
        return false;
      }

      // Create bulk free shipping stickers
      const stickersToInsert = productsForFreeShippingSticker.map((prod) => ({
        FreeShippingId: freeShippingId,
        ProductId: prod.Id,
        ProductVariantId: prod['ProductVariants.Id'] || null,
        StartDate: startDate ? startDate : null,
        EndDate: endDate ? endDate : null,
        Source: 'seller',
        IsActive: false,
        StatusId: AppConstants.FreeShippingStickerStatus.Pending
      }));

      await this.createBulkFreeShippingStickerRepository(stickersToInsert);

      const updateProductTimingPromises = productsForFreeShippingSticker.map(async (product) => {
        try {
          const updateData = {};

          // Always take the maximum/longest time range from the next person

          // If FreeShippingStartAt is null, set it to startDate
          if (!product.FreeShippingStartAt) {
            updateData.FreeShippingStartAt = startDate;
          }
          // If FreeShippingStartAt exists, take the earliest (minimum) to get the longest range
          else if (new Date(product.FreeShippingStartAt) > new Date(startDate)) {
            updateData.FreeShippingStartAt = startDate;
          }

          // If FreeShippingEndAt is null, set it to endDate
          if (!product.FreeShippingEndAt) {
            updateData.FreeShippingEndAt = endDate;
          }
          // If FreeShippingEndAt exists, take the latest (maximum) to get the longest range
          else if (new Date(product.FreeShippingEndAt) < new Date(endDate)) {
            updateData.FreeShippingEndAt = endDate;
          }

          updateData.IsFreeShippingApplied = true;
          updateData.StatusId = AppConstants.FreeShippingStickerStatus.Active;

          if (Object.keys(updateData).length > 0) {
            return this.updateProductFreeShippingRepository(product.Id, freeShipping.SellerId, updateData);
          }
        } catch (error) {
          logger.error(`Error updating product ${product.Id}:`, error);
        }
      });

      await Promise.all(updateProductTimingPromises);

      const jobOptions = {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnFail: false
      };

      // Schedule enable job
      freeShippingStickerQueue.add(
        { freeShippingId, productIds: productsForFreeShippingSticker.map((product) => product.Id), action: 'enable' },
        { delay: startDate.getTime() - Date.now(), jobId: `enable-${freeShippingId}`, ...jobOptions }
      );

      // Schedule disable job
      freeShippingStickerQueue.add(
        { freeShippingId, productIds: productsForFreeShippingSticker.map((product) => product.Id), action: 'disable' },
        { delay: endDate.getTime() - Date.now(), jobId: `disable-${freeShippingId}`, ...jobOptions }
      );

      return true;
    } catch (err) {
      logger.error('Error in createFreeShippingStickerServices', err);
      return false;
    }
  }

}

module.exports = new FreeShippingService();
