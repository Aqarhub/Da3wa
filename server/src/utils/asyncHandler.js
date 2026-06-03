'use strict';

/**
 * يغلّف معالج express غير المتزامن لتمرير الأخطاء إلى next() تلقائيًا.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
