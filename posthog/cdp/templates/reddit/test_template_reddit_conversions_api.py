from posthog.cdp.templates.helpers import BaseHogFunctionTemplateTest
from inline_snapshot import snapshot

from posthog.cdp.templates.reddit.template_reddit_conversions_api import template_reddit_conversions_api

TEST_EMAIL = "test@example.com"
TEST_PRODUCT_ID = "product12345"
TEST_PIXEL_ID = "pixel12345"
TEST_CONVERSION_ACCESS_TOKEN = "test_access_token"
TEST_EVENT_ID = "0194ff28-77c9-798a-88d5-7225f3d9a5a6"
TEST_EVENT_TIMESTAMP = 1739463203210
TEST_SCREEN_DIMENSIONS = {"width": 1920, "height": 1080}
TEST_HASH_USER_AGENT = "test_hashed_user_agent"


class TestTemplateRedditAds(BaseHogFunctionTemplateTest):
    template = template_reddit_conversions_api

    def _inputs(self, **kwargs):
        inputs = {
            "accountId": TEST_PIXEL_ID,
            "conversionsAccessToken": TEST_CONVERSION_ACCESS_TOKEN,
            "userProperties": {
                "email": TEST_EMAIL,
                "screen_dimensions": TEST_SCREEN_DIMENSIONS,
                "user_agent": TEST_HASH_USER_AGENT,
            },
            "eventTime": TEST_EVENT_TIMESTAMP,
        }
        inputs.update(kwargs)
        return inputs

    def test_pageview(self):
        self.run_function(
            self._inputs(
                # TODO ideally we would be testing the default mappings, and these would be generated by mapping the event data
                eventType="PageVisit",
                eventProperties={
                    "conversionId": TEST_EVENT_ID,
                    "products": [{"product_id": TEST_PRODUCT_ID}],
                },
            ),
            globals={
                "event": {
                    "timestamp": TEST_EVENT_TIMESTAMP,
                },
            },
        )

        assert self.get_mock_fetch_calls()[0] == snapshot(
            (
                "https://ads-api.reddit.com/api/v2.0/conversions/events/pixel12345",
                {
                    "body": {
                        "events": [
                            {
                                "event_at": 1739463203210,
                                "event_metadata": {
                                    "conversionId": "0194ff28-77c9-798a-88d5-7225f3d9a5a6",
                                    "products": [{"product_id": "product12345"}],
                                },
                                "event_type": {"tracking_type": "PageVisit"},
                                "user": {
                                    "email": "test@example.com",
                                    "screen_dimensions": {"height": 1080, "width": 1920},
                                    "user_agent": "test_hashed_user_agent",
                                },
                            }
                        ],
                        "test_mode": False,
                    },
                    "headers": {
                        "Authorization": f"Bearer test_access_token",
                        "Content-Type": "application/json",
                        "User-Agent": "hog:com.posthog.cdp:0.0.1 (by /u/PostHogTeam)",
                    },
                    "method": "POST",
                },
            )
        )
