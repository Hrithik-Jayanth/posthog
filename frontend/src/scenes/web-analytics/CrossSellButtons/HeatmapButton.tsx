import { LemonButton } from '@posthog/lemon-ui'
import { useValues } from 'kea'
import { appEditorUrl } from 'lib/components/AuthorizedUrlList/authorizedUrlListLogic'
import { FEATURE_FLAGS } from 'lib/constants'
import { IconHeatmap } from 'lib/lemon-ui/icons'
import { featureFlagLogic } from 'lib/logic/featureFlagLogic'
import { addProductIntentForCrossSell, ProductIntentContext } from 'lib/utils/product-intents'
import { urls } from 'scenes/urls'

import { WebStatsBreakdown } from '~/queries/schema/schema-general'
import { ProductKey } from '~/types'

import { webAnalyticsLogic } from '../webAnalyticsLogic'

interface HeatmapButtonProps {
    breakdownBy: WebStatsBreakdown
    value: string
}

// Currently can only support breakdown where the value is a pathname
const VALID_BREAKDOWN_VALUES = new Set([
    WebStatsBreakdown.Page,
    WebStatsBreakdown.InitialPage,
    WebStatsBreakdown.ExitPage,
    WebStatsBreakdown.ExitClick,
])

export const HeatmapButton = ({ breakdownBy, value }: HeatmapButtonProps): JSX.Element => {
    const { featureFlags } = useValues(featureFlagLogic)
    const { domainFilter: webAnalyticsSelectedDomain } = useValues(webAnalyticsLogic)

    // Doesn't make sense to show the button if there's no value
    if (value === '') {
        return <></>
    }

    // Currently heatmaps only support pathnames,
    // so we ignore the other breakdown types
    if (!VALID_BREAKDOWN_VALUES.has(breakdownBy)) {
        return <></>
    }

    // When there's no domain filter selected, just don't show the button
    if (!webAnalyticsSelectedDomain || webAnalyticsSelectedDomain === 'all') {
        return <></>
    }

    // Replace double slashes with single slashes in case domain has a trailing slash, and value has a leading slash
    const url = `${webAnalyticsSelectedDomain}${value}`.replace(/\/\//, '/')

    // Decide whether to use the new heatmaps UI or launch the user's website with the toolbar + heatmaps
    const to = featureFlags[FEATURE_FLAGS.HEATMAPS_UI]
        ? urls.heatmaps(`pageURL=${url}`)
        : appEditorUrl(url, { userIntent: 'heatmaps' })

    return (
        <LemonButton
            to={to}
            icon={<IconHeatmap />}
            type="tertiary"
            size="xsmall"
            tooltip="View heatmap for this page"
            className="no-underline"
            targetBlank
            onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                void addProductIntentForCrossSell({
                    from: ProductKey.WEB_ANALYTICS,
                    to: ProductKey.HEATMAPS,
                    intent_context: ProductIntentContext.WEB_ANALYTICS_INSIGHT,
                })
            }}
        />
    )
}
