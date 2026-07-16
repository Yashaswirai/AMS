class ApiResponse {
  constructor(statusCode, data, message = 'Success', meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta) {
      this.meta = meta;
    }
    this.timestamp = new Date().toISOString();
  }

  static success(data, message = 'Success', statusCode = 200, meta = null) {
    return new ApiResponse(statusCode, data, message, meta);
  }

  static created(data, message = 'Created successfully') {
    return new ApiResponse(201, data, message);
  }

  static paginated(data, pagination, message = 'Success') {
    return new ApiResponse(200, data, message, { pagination });
  }

  static noContent(message = 'Deleted successfully') {
    return new ApiResponse(204, null, message);
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

export default ApiResponse;
