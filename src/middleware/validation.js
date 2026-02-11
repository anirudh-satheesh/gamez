import { z } from 'zod';

export const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
            const parsed = schema.parse(data);

            try {
                if (source === 'body') req.body = parsed;
                else if (source === 'query') req.query = parsed;
                else if (source === 'params') req.params = parsed;
            } catch (err) {
                // Fallback for read-only properties (like in some Express/Node environments)
                Object.defineProperty(req, source, {
                    value: parsed,
                    configurable: true,
                    writable: true
                });
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const issues = error.errors || error.issues || [];
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: issues.map(issue => ({
                        path: issue.path,
                        message: issue.message,
                        code: issue.code
                    })),
                });
            }
            next(error);
        }
    };
};
