const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/APIFeatures');

exports.getAll = Model =>
  catchAsync(async (req, res, next) => {
    //for nested routes
    //ie: /model/modelId/reviews
    let filter = {};
    if (req.params.modelId) filter = { tour: req.params.modelId };

    //Build query, returns "this" query
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    //Execute query
    const docs = await features.query;
    //use explain() to get detailed results for performance evaluation
    // const docs = await features.query.explain();

    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      results: docs.length,
      data: { docs },
    });
  });

exports.getOne = Model =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      requestedAt: req.requestTime,
      data: { data: doc },
    });
  });

exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
