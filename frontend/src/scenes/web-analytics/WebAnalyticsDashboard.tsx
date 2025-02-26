import { IconExpand45, IconInfo, IconOpenSidebar, IconX } from '@posthog/icons'
import clsx from 'clsx'
import { BindLogic, useActions, useValues } from 'kea'
import { VersionCheckerBanner } from 'lib/components/VersionChecker/VersionCheckerBanner'
import { IconOpenInNew } from 'lib/lemon-ui/icons'
import { LemonButton } from 'lib/lemon-ui/LemonButton'
import { LemonSegmentedSelect } from 'lib/lemon-ui/LemonSegmentedSelect/LemonSegmentedSelect'
import { LemonTabs } from 'lib/lemon-ui/LemonTabs'
import { PostHogComDocsURL } from 'lib/lemon-ui/Link/Link'
import { Popover } from 'lib/lemon-ui/Popover'
import { isNotNil } from 'lib/utils'
import { addProductIntentForCrossSell, ProductIntentContext } from 'lib/utils/product-intents'
import React, { useState } from 'react'
import { WebAnalyticsErrorTrackingTile } from 'scenes/web-analytics/tiles/WebAnalyticsErrorTracking'
import { WebAnalyticsRecordingsTile } from 'scenes/web-analytics/tiles/WebAnalyticsRecordings'
import { WebQuery } from 'scenes/web-analytics/tiles/WebAnalyticsTile'
import { WebAnalyticsHealthCheck } from 'scenes/web-analytics/WebAnalyticsHealthCheck'
import {
    ProductTab,
    QueryTile,
    TabsTile,
    TileId,
    WEB_ANALYTICS_DATA_COLLECTION_NODE_ID,
    webAnalyticsLogic,
} from 'scenes/web-analytics/webAnalyticsLogic'
import { WebAnalyticsModal } from 'scenes/web-analytics/WebAnalyticsModal'

import { navigationLogic } from '~/layout/navigation/navigationLogic'
import { dataNodeCollectionLogic } from '~/queries/nodes/DataNode/dataNodeCollectionLogic'
import { QuerySchema } from '~/queries/schema/schema-general'
import { ProductKey } from '~/types'

import { WebAnalyticsFilters } from './WebAnalyticsFilters'

const Tiles = (): JSX.Element => {
    const { tiles } = useValues(webAnalyticsLogic)

    return (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xxl:grid-cols-3 gap-x-4 gap-y-12">
            {tiles.map((tile, i) => {
                if (tile.kind === 'query') {
                    return <QueryTileItem key={i} tile={tile} />
                } else if (tile.kind === 'tabs') {
                    return <TabsTileItem key={i} tile={tile} />
                } else if (tile.kind === 'replay') {
                    return <WebAnalyticsRecordingsTile key={i} tile={tile} />
                } else if (tile.kind === 'error_tracking') {
                    return <WebAnalyticsErrorTrackingTile key={i} tile={tile} />
                }
                return null
            })}
        </div>
    )
}

const QueryTileItem = ({ tile }: { tile: QueryTile }): JSX.Element => {
    const { query, title, layout, insightProps, control, showIntervalSelect, docs } = tile

    const { openModal } = useActions(webAnalyticsLogic)
    const { getNewInsightUrl } = useValues(webAnalyticsLogic)

    const buttonsRow = [
        tile.canOpenInsight ? (
            <LemonButton
                key="open-insight-button"
                to={getNewInsightUrl(tile.tileId)}
                icon={<IconOpenInNew />}
                size="small"
                type="secondary"
                onClick={() => {
                    void addProductIntentForCrossSell({
                        from: ProductKey.WEB_ANALYTICS,
                        to: ProductKey.PRODUCT_ANALYTICS,
                        intent_context: ProductIntentContext.WEB_ANALYTICS_INSIGHT,
                    })
                }}
            >
                Open as new Insight
            </LemonButton>
        ) : null,
        tile.canOpenModal ? (
            <LemonButton
                key="open-modal-button"
                onClick={() => openModal(tile.tileId)}
                icon={<IconExpand45 />}
                size="small"
                type="secondary"
            >
                Show more
            </LemonButton>
        ) : null,
    ].filter(isNotNil)

    return (
        <div
            className={clsx(
                'col-span-1 row-span-1 flex flex-col',
                layout.colSpanClassName ?? 'md:col-span-6',
                layout.rowSpanClassName ?? 'md:row-span-1',
                layout.orderWhenLargeClassName ?? 'xxl:order-12',
                layout.className
            )}
        >
            {title && (
                <h2 className="flex-1 m-0 flex flex-row ml-1">
                    {title}
                    {docs && <LearnMorePopover url={docs.url} title={docs.title} description={docs.description} />}
                </h2>
            )}

            <WebQuery
                query={query}
                insightProps={insightProps}
                control={control}
                showIntervalSelect={showIntervalSelect}
            />

            {buttonsRow.length > 0 ? <div className="flex justify-end my-2 space-x-2">{buttonsRow}</div> : null}
        </div>
    )
}

const TabsTileItem = ({ tile }: { tile: TabsTile }): JSX.Element => {
    const { layout } = tile

    const { openModal } = useActions(webAnalyticsLogic)
    const { getNewInsightUrl } = useValues(webAnalyticsLogic)

    return (
        <WebTabs
            className={clsx(
                'col-span-1 row-span-1',
                layout.colSpanClassName || 'md:col-span-1',
                layout.rowSpanClassName || 'md:row-span-1',
                layout.orderWhenLargeClassName || 'xxl:order-12',
                layout.className
            )}
            activeTabId={tile.activeTabId}
            setActiveTabId={tile.setTabId}
            tabs={tile.tabs.map((tab) => ({
                id: tab.id,
                content: (
                    <WebQuery
                        key={tab.id}
                        query={tab.query}
                        showIntervalSelect={tab.showIntervalSelect}
                        control={tab.control}
                        insightProps={tab.insightProps}
                    />
                ),
                linkText: tab.linkText,
                title: tab.title,
                canOpenModal: !!tab.canOpenModal,
                canOpenInsight: !!tab.canOpenInsight,
                query: tab.query,
                docs: tab.docs,
            }))}
            tileId={tile.tileId}
            openModal={openModal}
            getNewInsightUrl={getNewInsightUrl}
        />
    )
}

export const WebTabs = ({
    className,
    activeTabId,
    tabs,
    setActiveTabId,
    openModal,
    getNewInsightUrl,
    tileId,
}: {
    className?: string
    activeTabId: string
    tabs: {
        id: string
        title: string
        linkText: string
        content: React.ReactNode
        canOpenModal?: boolean
        canOpenInsight: boolean
        query: QuerySchema
        docs: LearnMorePopoverProps | undefined
    }[]
    setActiveTabId: (id: string) => void
    openModal: (tileId: TileId, tabId: string) => void
    getNewInsightUrl: (tileId: TileId, tabId: string) => string | undefined
    tileId: TileId
}): JSX.Element => {
    const activeTab = tabs.find((t) => t.id === activeTabId)
    const newInsightUrl = getNewInsightUrl(tileId, activeTabId)

    const buttonsRow = [
        activeTab?.canOpenInsight && newInsightUrl ? (
            <LemonButton
                key="open-insight-button"
                to={newInsightUrl}
                icon={<IconOpenInNew />}
                size="small"
                type="secondary"
                onClick={() => {
                    void addProductIntentForCrossSell({
                        from: ProductKey.WEB_ANALYTICS,
                        to: ProductKey.PRODUCT_ANALYTICS,
                        intent_context: ProductIntentContext.WEB_ANALYTICS_INSIGHT,
                    })
                }}
            >
                Open as new Insight
            </LemonButton>
        ) : null,
        activeTab?.canOpenModal ? (
            <LemonButton
                key="open-modal-button"
                onClick={() => openModal(tileId, activeTabId)}
                icon={<IconExpand45 />}
                size="small"
                type="secondary"
            >
                Show more
            </LemonButton>
        ) : null,
    ].filter(isNotNil)

    return (
        <div className={clsx(className, 'flex flex-col')}>
            <div className="flex flex-row items-center self-stretch mb-3">
                <h2 className="flex-1 m-0 flex flex-row ml-1">
                    {activeTab?.title}
                    {activeTab?.docs && (
                        <LearnMorePopover
                            url={activeTab.docs.url}
                            title={activeTab.docs.title}
                            description={activeTab.docs.description}
                        />
                    )}
                </h2>

                <LemonSegmentedSelect
                    shrinkOn={7}
                    size="small"
                    disabled={false}
                    value={activeTabId}
                    dropdownMatchSelectWidth={false}
                    onChange={setActiveTabId}
                    options={tabs.map(({ id, linkText }) => ({ value: id, label: linkText }))}
                />
            </div>
            <div className="flex-1 flex flex-col">{activeTab?.content}</div>
            {buttonsRow.length > 0 ? <div className="flex justify-end my-2 space-x-2">{buttonsRow}</div> : null}
        </div>
    )
}

export interface LearnMorePopoverProps {
    url?: PostHogComDocsURL
    title: string
    description: string | JSX.Element
}

export const LearnMorePopover = ({ url, title, description }: LearnMorePopoverProps): JSX.Element => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Popover
            visible={isOpen}
            onClickOutside={() => setIsOpen(false)}
            overlay={
                <div className="p-4">
                    <div className="flex flex-row w-full">
                        <h2 className="flex-1">{title}</h2>
                        <LemonButton
                            targetBlank
                            type="tertiary"
                            onClick={() => setIsOpen(false)}
                            size="small"
                            icon={<IconX />}
                        />
                    </div>
                    <div className="text-sm text-gray-700">{description}</div>
                    {url && (
                        <div className="flex justify-end mt-4">
                            <LemonButton
                                to={url}
                                onClick={() => setIsOpen(false)}
                                targetBlank={true}
                                sideIcon={<IconOpenSidebar />}
                            >
                                Learn more
                            </LemonButton>
                        </div>
                    )}
                </div>
            }
        >
            <LemonButton onClick={() => setIsOpen(!isOpen)} size="small" icon={<IconInfo />} className="ml-1 mb-1" />
        </Popover>
    )
}

export const WebAnalyticsDashboard = (): JSX.Element => {
    const { mobileLayout } = useValues(navigationLogic)
    const { productTab } = useValues(webAnalyticsLogic)

    const { setProductTab } = useActions(webAnalyticsLogic)

    return (
        <BindLogic logic={webAnalyticsLogic} props={{}}>
            <BindLogic logic={dataNodeCollectionLogic} props={{ key: WEB_ANALYTICS_DATA_COLLECTION_NODE_ID }}>
                <WebAnalyticsModal />
                <VersionCheckerBanner />
                <div className="WebAnalyticsDashboard w-full flex flex-col">
                    <div
                        className={clsx(
                            'sticky z-20 bg-primary border-b pb-2',
                            mobileLayout
                                ? 'top-[var(--breadcrumbs-height-full)]'
                                : 'top-[var(--breadcrumbs-height-compact)]'
                        )}
                    >
                        <LemonTabs<ProductTab>
                            activeKey={productTab}
                            onChange={setProductTab}
                            tabs={[
                                { key: ProductTab.ANALYTICS, label: 'Web analytics' },
                                { key: ProductTab.WEB_VITALS, label: 'Web vitals' },
                            ]}
                        />

                        <WebAnalyticsFilters />
                    </div>

                    <WebAnalyticsHealthCheck />
                    <Tiles />
                </div>
            </BindLogic>
        </BindLogic>
    )
}
