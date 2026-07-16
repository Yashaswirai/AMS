/**
 * Build pagination metadata and mongoose query options
 */
export const paginate = (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Build pagination metadata for response
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };
};

/**
 * Build sort object from query string
 * e.g. sort=-createdAt,name -> { createdAt: -1, name: 1 }
 */
export const buildSort = (sortQuery = '-createdAt') => {
  const sortFields = sortQuery.split(',');
  const sort = {};
  sortFields.forEach((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      sort[trimmed.substring(1)] = -1;
    } else {
      sort[trimmed] = 1;
    }
  });
  return sort;
};

/**
 * Build search filter for multiple fields
 */
export const buildSearchFilter = (searchQuery, fields = []) => {
  if (!searchQuery || !fields.length) return {};
  const regex = new RegExp(searchQuery, 'i');
  return {
    $or: fields.map((field) => ({ [field]: regex })),
  };
};
