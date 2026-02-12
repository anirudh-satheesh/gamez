import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

if (!arcjetKey) throw new Error('ARCJET_KEY environment variable is missing');

export const httpArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', "CATEGORY:PREVIEW"] }),
            slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 })
        ],
    }) : null;

export const wsArcjet = arcjetKey ?
    arcjet({
        key: arcjetKey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', "CATEGORY:PREVIEW"] }),
            slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 })
        ],
    }) : null;


export function securityMiddleware() {
    return async (req, res, next) => {
        if (!httpArcjet) return next();

        try {
            const decision = await httpArcjet.protect(req);

            // Log decision summary
            if (decision.isDenied()) {
                if (decision.reason.isRateLimit()) {
                    console.warn(`[Arcjet] 🚫 Rate Limit Exceeded: ${req.method} ${req.path} from ${req.ip}`);
                    return res.status(429).json({
                        error: 'Too Many Requests',
                        message: 'Our servers are currently busy. Please try again in a few moments.'
                    });
                }
                console.warn(`[Arcjet] 🚫 Access Denied: ${req.method} ${req.path} - Reason: ${decision.reason}`);
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Optional: Log allowed requests in dev
            console.log(`[Arcjet] ✅ Allowed: ${req.method} ${req.path}`);

        } catch (e) {
            console.error('[Arcjet] Middleware error:', e);
            // Non-blocking fallback: allow the request if Arcjet fails
            return next();
        }

        next();

    }
}