function success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}

function paginated(res, data, total, page, limit, message = "Success") {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
}

module.exports = { success, paginated };