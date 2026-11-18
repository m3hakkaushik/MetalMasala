import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalytics } from '../../api/admin';
import { money } from '../../api/catalogue';
import { Seo } from '../../app/Seo';
import { Field } from '../../components/ui/Field';
import { RequestError } from '../../components/ui/Status';
import { useAuth } from '../../stores/auth.store';

function Panel({ title, query, children }) {
  return (
    <section className="account-panel dashboard-panel">
      <h3>{title}</h3>
      {query.isPending && <p role="status">Loading {title.toLowerCase()}…</p>}
      {query.isError && (
        <RequestError error={query.error} retry={query.refetch} />
      )}
      {query.data && children(query.data.data)}
    </section>
  );
}

function RevenueChart({ data, range }) {
  function label(value) {
    const day = value.length === 7 ? value + '-01' : value;
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      ...(range === '12m' ? {} : { day: 'numeric' }),
      timeZone: 'UTC',
    }).format(new Date(day));
  }
  return (
    <div className="dashboard-chart">
      <ResponsiveContainer width="100%" height={245}>
        <LineChart
          data={data}
          margin={{ left: 5, right: 12, top: 10, bottom: 3 }}
          accessibilityLayer
        >
          <CartesianGrid stroke="var(--stroke)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={label} minTickGap={25} />
          <YAxis tickFormatter={money} width={74} />
          <Tooltip
            labelFormatter={label}
            formatter={(value) => [money(value), 'Revenue']}
          />
          <Line
            dataKey="revenue"
            stroke="var(--patina)"
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryChart({ data }) {
  if (!data.length) return <p>No category sales yet.</p>;
  return (
    <div className="dashboard-chart">
      <ResponsiveContainer
        width="100%"
        height={Math.max(200, data.length * 33)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 3, right: 18 }}
          accessibilityLayer
        >
          <XAxis type="number" tickFormatter={money} />
          <YAxis dataKey="category" type="category" width={115} />
          <Tooltip formatter={(value) => [money(value), 'Revenue']} />
          <Bar
            dataKey="revenue"
            fill="var(--gulaal-dark)"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const userId = useAuth((state) => state.user.id);
  const [range, setRange] = useState('30d');
  const queries = [
    ['summary', {}],
    ['revenue', { range }],
    ['sales-by-category', {}],
    ['top-products', { limit: 5 }],
  ];
  const [summary, revenue, categories, products] = useQueries({
    queries: queries.map(([path, params]) => ({
      queryKey: ['admin', userId, 'analytics', path, params],
      queryFn: ({ signal }) => getAnalytics(path, params, signal),
    })),
  });
  const stats = summary.data?.data;
  return (
    <>
      <Seo title="Store overview" />
      <div className="panel-heading">
        <h2>Store overview</h2>
        <Field
          label="Revenue period"
          as="select"
          value={range}
          onChange={(event) => setRange(event.target.value)}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="12m">Last 12 months</option>
        </Field>
      </div>
      {summary.isPending && <p role="status">Loading key metrics…</p>}
      {summary.isError && (
        <RequestError error={summary.error} retry={summary.refetch} />
      )}
      {stats && (
        <dl className="dashboard-kpis">
          {[
            ['Revenue', money(stats.revenue)],
            ['Orders', stats.orders],
            ['Average order', money(stats.avgOrderValue)],
            ['Customers', stats.customers],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="account-columns">
        <Panel title="Revenue" query={revenue}>
          {(data) => <RevenueChart data={data} range={range} />}
        </Panel>
        <Panel title="Sales by category" query={categories}>
          {(data) => <CategoryChart data={data} />}
        </Panel>
        <Panel title="Top products" query={products}>
          {(data) =>
            data.length ? (
              <ul className="metric-list">
                {data.map(({ product, revenue, unitsSold }) => (
                  <li key={product.id}>
                    <Link className="text-link" to={`/product/${product.slug}`}>
                      {product.name}
                    </Link>
                    <span>
                      {unitsSold} sold · {money(revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No products sold yet.</p>
            )
          }
        </Panel>
        <Panel title="Low stock" query={summary}>
          {({ lowStock }) =>
            lowStock.length ? (
              <ul className="metric-list">
                {lowStock.map((product) => (
                  <li key={product.id}>
                    <Link className="text-link" to={`/product/${product.slug}`}>
                      {product.name}
                    </Link>
                    <span className={product.stock ? '' : 'field-error'}>
                      {product.stock
                        ? `${product.stock} remaining`
                        : 'Sold out'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>All products are above the low-stock threshold.</p>
            )
          }
        </Panel>
      </div>
    </>
  );
}
