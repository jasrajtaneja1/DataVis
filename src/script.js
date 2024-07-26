const width = 1000;
const height = 400;
const margin = { top: 20, right: 225, bottom: 30, left: 40 };

function parseData(data) {
  const parsedData = {
    years: {},
    category: "",
    ageGroup: "",
    familyType: "",
    product: "",
  };
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      if (key === "Household expenditures/summary-level categories") {
        parsedData.category = value;
      } else if (key === "Family type") {
        if (value && value !== "") {
          familyType = value;
        }
        parsedData.familyType = familyType;
      } else if (key === "Age of older adult") {
        parsedData.ageGroup = value;
      } else if (key === "Products 5") {
        parsedData.product = value;
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
  return parseData(d);
})
  .then((data) => {
    // Define new grouped categories
    const newCategories = {
      "Basic Needs": ["Shelter", "Food expenditures", "Health care"],
      "Lifestyle": ["Clothing and accessories", "Transportation", "Education"],
      "Leisure and Contributions": ["Recreation", "Gifts of money, support payments and charitable contributions"],
      "Total expenditure": ["Total expenditure"]
    };

    // Aggregate data for each new category
    const years = Object.keys(data[0].years).map(year => parseInt(year));
    const aggregatedData = years.map(year => {
      const result = { year: year };
      for (const [newCategory, oldCategories] of Object.entries(newCategories)) {
        result[newCategory] = oldCategories.reduce((sum, category) => {
          const categoryData = data.find(d => d.category === category);
          return sum + (categoryData && categoryData.years[year] != null ? categoryData.years[year] : 0);
        }, 0);
      }
      return result;
    });

    // Filter out years with any missing data
    const validData = aggregatedData.filter(d => Object.keys(newCategories).every(key => d[key] !== 0));

    // Create scales
    const x = d3.scaleTime()
      .domain(d3.extent(validData, d => d.year))
      .range([0, width - margin.left - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(validData, d => Object.keys(newCategories).reduce((sum, key) => sum + (d[key] || 0), 0))])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    const color = d3.scaleOrdinal()
      .domain(Object.keys(newCategories))
      .range(d3.schemeCategory10);

    // Stack the data with "Total expenditure" on top
    const stackOrder = Object.keys(newCategories).filter(key => key !== "Total expenditure").concat("Total expenditure");
    const stack = d3.stack()
      .keys(stackOrder)
      .value((d, key) => d[key]);

    const stackedSeries = stack(validData);

    // Create area generator
    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]));

    // Append paths for each area
    svg.selectAll(".area")
      .data(stackedSeries)
      .enter()
      .append("path")
      .attr("class", "area")
      .attr("d", area)
      .attr("fill", d => color(d.key));

    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // Add y-axis
    svg.append("g")
      .call(d3.axisLeft(y));

    // Add labels to the right of the graph
    svg.selectAll(".label")
      .data(stackedSeries)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", width - margin.right + 5)  // Adjust x position
      .attr("y", d => y(d[d.length - 1][1]) + (y(d[d.length - 1][0]) - y(d[d.length - 1][1])) / 2)
      .attr("dy", "0.35em")
      .style("fill", d => color(d.key))
      .text(d => d.key);
  })
  .catch((error) => {
    console.error("Error loading or processing data:", error);
  });