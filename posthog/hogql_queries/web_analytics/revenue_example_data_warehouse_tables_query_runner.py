from typing import Union

from posthog.hogql import ast
from posthog.hogql.constants import LimitContext
from posthog.hogql_queries.insights.paginators import HogQLHasMorePaginator
from posthog.hogql_queries.query_runner import QueryRunner
from posthog.schema import (
    RevenueExampleDataWarehouseTablesQuery,
    RevenueExampleDataWarehouseTablesQueryResponse,
    CachedRevenueExampleDataWarehouseTablesQueryResponse,
)


class RevenueExampleDataWarehouseTablesQueryRunner(QueryRunner):
    query: RevenueExampleDataWarehouseTablesQuery
    response: RevenueExampleDataWarehouseTablesQueryResponse
    cached_response: CachedRevenueExampleDataWarehouseTablesQueryResponse
    paginator: HogQLHasMorePaginator

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.paginator = HogQLHasMorePaginator.from_limit_context(
            limit_context=LimitContext.QUERY, limit=self.query.limit if self.query.limit else None
        )

    def to_query(self) -> Union[ast.SelectQuery, ast.SelectSetQuery]:
        tracking_config = self.query.revenueTrackingConfig

        # TODO: Convert between currencies
        queries = []
        if tracking_config.dataWarehouseTables:
            for table in tracking_config.dataWarehouseTables:
                queries.append(
                    ast.SelectQuery(
                        select=[
                            ast.Alias(alias="table_name", expr=ast.Constant(value=table.tableName)),
                            ast.Alias(alias="revenue", expr=ast.Field(chain=[table.tableName, table.revenueColumn])),
                        ],
                        select_from=ast.JoinExpr(table=ast.Field(chain=[table.tableName])),
                        order_by=[
                            ast.OrderExpr(expr=ast.Field(chain=[table.tableName, table.timestampColumn]), order="DESC")
                        ],
                    )
                )

        # If no queries, return a select with no results
        if len(queries) == 0:
            return ast.SelectQuery.empty()

        return ast.SelectSetQuery.create_from_queries(queries, set_operator="UNION ALL")

    def calculate(self):
        response = self.paginator.execute_hogql_query(
            query_type="revenue_example_external_tables_query",
            query=self.to_query(),
            team=self.team,
            timings=self.timings,
            modifiers=self.modifiers,
        )

        return RevenueExampleDataWarehouseTablesQueryResponse(
            columns=["table_name", "revenue"],
            results=response.results,
            timings=response.timings,
            types=response.types,
            hogql=response.hogql,
            modifiers=self.modifiers,
            **self.paginator.response_params(),
        )
