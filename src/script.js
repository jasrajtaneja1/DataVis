const width = 800;
const height = 400;
const margin = { top: 20, right: 30, bottom: 30, left: 40 };

function parseData(data) {
  const parsedData = {
    years: {},
    category: "",
  };

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (key === "Household expenditures/summary-level categories") {
        parsedData.category = value;
      } else {
        if (value === "..") {
          parsedData.years[key] = null; // Handle missing data
        } else {
          parsedData.years[key] = parseInt(value.replace(/,/g, ""), 10);
        }
      }
    }
  }

  return parsedData;
}

const svg = d3
  .select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Load and process data
d3.csv("./data/household_spending.csv", (d) => {
  console.log(parseData(d));
  return parseData(d);
})
  .then((data) => {
    // Group data by 'Statistic'
    const dataByStatistic = d3.groups(data, (d) => d.Statistic);

    const keys = dataByStatistic.map((d) => d[0]);

    // Stack the data
    const stack = d3
      .stack()
      .keys(keys)
      .value((d, key) => {
        const entry = d.find((e) => e.Statistic === key);
        return entry ? entry.Value : 0;
      });

    const stackedData = stack(dataByStatistic);

    // Create scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.Year))
      .range([0, width - margin.left - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(stackedData, (d) => d3.max(d, (d) => d[1]))])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    const color = d3.scaleOrdinal().domain(keys).range(d3.schemeCategory10);

    // Create area generator
    const area = d3
      .area()
      .x((d) => x(d.data.Year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]));

    // Append paths for each area
    svg
      .selectAll(".area")
      .data(stackedData)
      .enter()
      .append("path")
      .attr("class", "area")
      .attr("d", area)
      .attr("fill", (d) => color(d.key));

    // Add axes
    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g").call(d3.axisLeft(y));
  })
  .catch((error) => {
    console.error("Error loading or processing data:", error);
  });
