const width = 1000;
const height = 700;
const margin = { top: 80, right: 400, bottom: 50, left: 60 };

function generateYearsList(min = 2001) {
  let years = [{ value: 0, text: " -- " }];
  for (let i = min; i < 2022; i++) {
    var singleObj = {};
    singleObj["value"] = i;
    singleObj["text"] = `${i}`;
    years.push(singleObj);
  }
  return years;
}

function updateYearOptions() {
  minYear.innerHTML = "";
  maxYear.innerHTML = "";

  const selectedContent = chartContent.value;
  const min = selectedContent === "income" ? 2001 : 2010;
  const years = generateYearsList(min);

  // Populate minYear dropdown
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year.value;
    option.textContent = year.text;
    minYear.appendChild(option);
  });
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year.value;
    option.textContent = year.text;
    maxYear.appendChild(option);
  });
}

function parseData(data) {
  const parsedData = {
    years: {},
    category: "",
    ageGroup: "",
    familyType: "",
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
        if (minYear) {
          if (value === "..") {
            parsedData.years[key] = null; // Handle missing data
          } else {
            parsedData.years[key] = parseInt(value.replace(/,/g, ""), 10);
          }
        } else {
          if (value === "..") {
            parsedData.years[key] = null; // Handle missing data
          } else {
            parsedData.years[key] = parseInt(value.replace(/,/g, ""), 10);
          }
        }
      }
    }
  }

  return parsedData;
}

// Event Listeners
const types = [];
const form = document.querySelector("form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  types.forEach((e) => types.pop());
  document.querySelectorAll('[type="checkbox"]').forEach((e) => {
    if (e.checked === true) {
      console.log(`submitted ${e.value}`);
      types.push(e.value);
    }
  });
  console.log(`types: ${types}`);
});
chartContent.addEventListener("change", updateYearOptions);

document.getElementById("chartContent").onchange = () => {
  generateChart(document.getElementById("chartContent"));
};

function generateChart(e) {
  var value = e.value;
  d3.select("#chartInner").remove();
  switch (value) {
    case "all":
      console.log("showing all");
      return incomeAndSpendingChart();
    case "income":
      console.log("showing income");
      return incomeChart();
    case "spending":
      console.log("showing spending");
      return createProductCostChart();
    default:
      console.log("unknown");
      return;
  }
}

function spendingChart() {
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("id", "chartInner")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add title
  svg
    .append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Inflation Impact on Household Expenditures");

  // Load and process data

  return d3
    .csv("./data/household_spending.csv", (d) => {
      return parseData(d);
    })
    .then((data) => {
      // Define new grouped categories
      const newCategories = {
        "Income Taxes": ["Income taxes"],
        Housing: [
          "Principal accommodation",
          "Other accommodation",
          "Household operations",
          "Household furnishings and equipment",
        ],
        Food: ["Food purchased from stores", "Food purchased from restaurants"],
        Transportation: ["Private transportation", "Public transportation"],
        "Health Care": ["Health care", "Personal care"],
        "Insurance and Pension": [
          "Personal insurance payments and pension contributions",
        ],
        "Lifestyle and Education": ["Clothing and accessories", "Education"],
        Recreation: [
          "Recreational equipment and related services",
          "Home entertainment equipment and services",
          "Recreational services",
          "Recreational vehicles and associated services",
        ],
        Miscellaneous: [
          "Reading materials and other printed matter",
          "Tobacco products, alcoholic beverages and cannabis",
          "Games of chance",
          "Miscellaneous expenditures",
          "Gifts of money, support payments and charitable contributions",
        ],
      };

      // Aggregate data for each new category
      const years = Object.keys(data[0].years).map((year) => parseInt(year));
      const aggregatedData = years.map((year) => {
        const result = { year: year };
        for (const [newCategory, oldCategories] of Object.entries(
          newCategories
        )) {
          result[newCategory] = oldCategories.reduce((sum, category) => {
            const categoryData = data.find((d) => d.category === category);
            return (
              sum +
              (categoryData && categoryData.years[year] != null
                ? categoryData.years[year]
                : 0)
            );
          }, 0);
        }
        return result;
      });

      // Filter out years with any missing data
      const validData = aggregatedData.filter((d) =>
        Object.keys(newCategories).every((key) => d[key] !== 0)
      );

      // Create scales
      const x = d3
        .scaleTime()
        .domain(d3.extent(validData, (d) => d.year))
        .range([0, width - margin.left - margin.right]);

      const y = d3
        .scaleLinear()
        .domain([
          0,
          d3.max(validData, (d) =>
            Object.keys(newCategories).reduce(
              (sum, key) => sum + (d[key] || 0),
              0
            )
          ),
        ])
        .nice()
        .range([height - margin.top - margin.bottom, 0]);

      const color = d3
        .scaleOrdinal()
        .domain(Object.keys(newCategories))
        .range(d3.schemeCategory10);

      // Stack the data with "Total expenditure" on top
      const stackOrder = Object.keys(newCategories).filter(
        (key) => key !== "Total expenditure"
      );
      const stack = d3
        .stack()
        .keys(stackOrder)
        .value((d, key) => d[key]);

      const stackedSeries = stack(validData);

      // Create area generator
      const area = d3
        .area()
        .x((d) => x(d.data.year))
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]));

      // Create title
      svg
        .append("text")
        .attr("x", width / 3)
        .attr("y", 0 - margin.top / 6)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text("Average Expenditure per Household");

      // Append paths for each area
      svg
        .selectAll(".area")
        .data(stackedSeries)
        .enter()
        .append("path")
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", (d) => color(d.key));

      // Add x-axis
      svg
        .append("g")
        .attr(
          "transform",
          `translate(0,${height - margin.top - margin.bottom})`
        )
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      // Add y-axis
      svg.append("g").call(d3.axisLeft(y));

      // Add labels to the right of the graph
      svg
        .selectAll(".label")
        .data(stackedSeries)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", width - margin.right + 5) // Adjust x position
        .attr(
          "y",
          (d) =>
            y(d[d.length - 1][1]) +
            (y(d[d.length - 1][0]) - y(d[d.length - 1][1])) / 2
        )
        .attr("dy", "0.35em")
        .style("fill", (d) => color(d.key))
        .text((d) => d.key);
    })
    .catch((error) => {
      console.error("Error loading or processing data:", error);
    });
}

function incomeChart() {
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("id", "chartInner")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add title
  svg
    .append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Income Change Over Years by Family Type");

  svg
    .append("text")
    .attr("x", width / 3)
    .attr("y", 0 - margin.top / 6)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text("Median Expenditure per Household");

  // Load and process data
  return d3
    .csv("./data/household_income.csv", (d) => {
      return parseData(d);
    })
    .then((data) => {
      console.log("Data loaded:", data);

      // Define categories
      const categories = [
        "Couple families",
        "Lone-parent families",
        "Persons not in census families",
      ];
      const years = Object.keys(data[0].years).map((d) => +d);

      // Prepare data for line chart
      const series = categories.map((category) => ({
        name: category,
        values: years.map((year) => ({
          year: year,
          value: data.find((d) => d.familyType === category).years[year],
        })),
      }));

      // Filter valid data
      const validData = series.map((s) => ({
        name: s.name,
        values: s.values.filter((v) => v.value !== null),
      }));

      // Create scales
      const x = d3
        .scaleTime()
        .domain(d3.extent(years, (d) => d))
        .range([0, width - margin.left - margin.right]);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(validData, (s) => d3.max(s.values, (v) => v.value))])
        .nice()
        .range([height - margin.top - margin.bottom, 0]);

      const color = d3
        .scaleOrdinal()
        .domain(categories)
        .range(d3.schemeCategory10);

      // Create line generator
      const line = d3
        .line()
        .x((d) => x(d.year))
        .y((d) => y(d.value));

      // Append lines for each category
      validData.forEach((category) => {
        svg
          .append("path")
          .datum(category.values)
          .attr("fill", "none")
          .attr("stroke", color(category.name))
          .attr("stroke-width", 1.5)
          .attr("d", line);
      });

      // Add x-axis
      svg
        .append("g")
        .attr(
          "transform",
          `translate(0,${height - margin.top - margin.bottom})`
        )
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

      // Add y-axis
      svg.append("g").call(d3.axisLeft(y));

      // Add legend
      validData.forEach((category, index) => {
        svg
          .append("text")
          .attr("x", width - margin.right + 5)
          .attr("y", index * 20)
          .attr("dy", "0.35em")
          .style("fill", color(category.name))
          .text(category.name);
      });
    })
    .catch((error) => {
      console.error("Error loading or processing data:", error);
    });
}


function incomeAndSpendingChart() {
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("id", "chartInner")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  Promise.all([
    d3.csv("./data/household_spending.csv", (d) => parseData(d)),
    d3.csv("./data/household_income.csv", (d) => parseData(d)),
  ]).then(([spendingData, incomeData]) => {
    // Process spending data for "Total expenditure"
    const spendingYears = Object.keys(spendingData[0].years)
      .map((year) => parseInt(year))
      .filter((year) => year >= 2010);

    const totalExpenditureData = spendingData.find(
      (d) => d.category === "Total expenditure"
    );

    const avgSpending = spendingYears.map((year) => {
      let value = totalExpenditureData.years[year] || 0;
      if (year === 2018) {
        const value2017 = totalExpenditureData.years[2017] || 0;
        const value2019 = totalExpenditureData.years[2019] || 0;
        value = (value2017 + value2019) / 2;
      }
      if (year === 2020) {
        const value2019 = totalExpenditureData.years[2019] || 0;
        const value2021 = totalExpenditureData.years[2021] || 0;
        value = (value2019 + value2021) / 2;
      }
      return {
        year: new Date(year, 0, 1),
        value: value,
      };
    });

    // Process income data for "Couple families"
    const coupleFamiliesData = incomeData.find(
      (d) => d.familyType === "Couple families"
    );

    const avgIncome = spendingYears.map((year) => {
      let value = coupleFamiliesData.years[year] || 0;
      if (year === 2018) {
        const value2017 = coupleFamiliesData.years[2017] || 0;
        const value2019 = coupleFamiliesData.years[2019] || 0;
        value = (value2017 + value2019) / 2;
      }
      if (year === 2020) {
        const value2019 = coupleFamiliesData.years[2019] || 0;
        const value2021 = coupleFamiliesData.years[2021] || 0;
        value = (value2019 + value2021) / 2;
      }
      return {
        year: new Date(year, 0, 1),
        value: value,
      };
    });

    // Create scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(avgSpending, (d) => d.year))
      .range([0, width - margin.left - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max([
          d3.max(avgSpending, (d) => d.value),
          d3.max(avgIncome, (d) => d.value),
        ]),
      ])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    const areaSpending = d3
      .area()
      .x((d) => x(d.year))
      .y0(y(0))
      .y1((d) => y(d.value));

    const areaIncome = d3
      .area()
      .x((d) => x(d.year))
      .y0(y(0))
      .y1((d) => y(d.value));

    const line = d3
      .line()
      .x((d) => x(d.year))
      .y((d) => y(d.value));

    // Append paths for spending and income
    svg
      .append("path")
      .datum(avgSpending)
      .attr("fill", "steelblue")
      .attr("opacity", 0.5)
      .attr("d", areaSpending)
      .attr("class", "spending-area");

    svg
      .append("path")
      .datum(avgIncome)
      .attr("fill", "lightgreen")
      .attr("opacity", 0.5)
      .attr("d", areaIncome)
      .attr("class", "income-area");

    svg
      .append("path")
      .datum(avgSpending)
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-width", 2.5)
      .attr("d", line)
      .attr("class", "spending-line");

    svg
      .append("path")
      .datum(avgIncome)
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("stroke-width", 2.5)
      .attr("d", line)
      .attr("class", "income-line");

    // Add x-axis
    svg
      .append("g")
      .attr(
        "transform",
        `translate(0,${height - margin.top - margin.bottom})`
      )
      .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));

    // Add y-axis
    svg.append("g").call(d3.axisLeft(y));

    // Add title
    svg
      .append("text")
      .attr("x", (width - margin.left - margin.right) / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "20px")
      .style("font-weight", "bold")
      .text("Average Income and Spending Over Years");

    // Add legend
    const legend = svg
      .append("g")
      .attr("transform", `translate(${width - margin.right + 20}, 20)`);

    legend
      .append("rect")
      .attr("x", -15)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "steelblue");
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 10)
      .text("Average Spending");

    legend
      .append("rect")
      .attr("x", -15)
      .attr("y", 20)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "lightgreen");
    legend
      .append("text")
      .attr("x", 0)
      .attr("y", 30)
      .text("Average Income (Couple Families)");
  });
}


function parseDataByYear(data) {
  const yearlyData = {};

  // Define the years you want to parse
  const years = Array.from({ length: 22 }, (v, i) => i + 2000);

  // Check if data is an array
  if (!Array.isArray(data)) {
      console.error("Data is not an array:", data);
      return yearlyData;
  }

  // Loop through each row (each product)
  data.forEach(row => {
      const productName = row["Products"];
      if (!yearlyData[productName]) {
          yearlyData[productName] = [];
      }

      // Loop through each year
      years.forEach(year => {
          // Define the months
          const months = ["January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"];
          
          // Create the list of keys for the current year
          const yearColumns = months.map(month => `${month} ${year}`);

          // Initialize the accumulator for the current year
          let yearTotal = 0;
          let count = 0;

          // Accumulate the total and count of valid entries for the current year
          yearColumns.forEach(col => {
              if (col in row && !isNaN(row[col])) {
                  yearTotal += parseFloat(row[col]);
                  count++;
              }
          });

          // Calculate the average for the current year
          const yearAverage = count > 0 ? (yearTotal / count) : 0;

          // Add the average data to the yearlyData object for the current product
          yearlyData[productName].push({ year: year, averagePrice: yearAverage });
      });
  });

  return yearlyData;
}

// D3 CSV loading and parsing
d3.csv("./data/consumer_product_cost.csv").then(data => {
  console.log("Raw data loaded:", data);

  const parsedData = parseDataByYear(data);
  console.log("Parsed data for products:", parsedData);
}).catch(error => {
  console.error("Error loading CSV data:", error);
});

function createProductCostChart() {
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("id", "chartInner")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Average Product Costs Over Years");

  d3.csv("./data/consumer_product_cost.csv").then((data) => {
    const parsedData = parseDataByYear(data);

    const x = d3.scaleBand().range([0, width - margin.left - margin.right]).padding(0.1);
    const y = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const updateChart = (selectedYear) => {
      const yearData = Object.entries(parsedData).map(([product, values]) => {
        const yearValue = values.find((v) => v.year === selectedYear);
        return {
          product: product,
          averagePrice: yearValue ? yearValue.averagePrice : 0,
        };
      });

      x.domain(yearData.map((d) => d.product));
      y.domain([0, d3.max(yearData, (d) => d.averagePrice)]);

      svg.selectAll(".bar").remove();
      svg.selectAll(".x-axis").remove();
      svg.selectAll(".y-axis").remove();

      svg
        .selectAll(".bar")
        .data(yearData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.product))
        .attr("width", x.bandwidth())
        .attr("y", (d) => y(d.averagePrice))
        .attr("height", (d) => height - margin.top - margin.bottom - y(d.averagePrice))
        .attr("fill", (d) => color(d.product));

      svg
        .append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

      svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y));
    };

    const slider = d3
      .sliderBottom()
      .min(2000)
      .max(2021)
      .step(1)
      .width(400)
      .default(2000)
      .on("onchange", (val) => {
        updateChart(val);
      });

    const gSlider = d3
      .select("#chart")
      .append("svg")
      .attr("width", 500)
      .attr("height", 100)
      .append("g")
      .attr("transform", "translate(30,30)");

    gSlider.call(slider);

    updateChart(2000);
  }).catch((error) => {
    console.error("Error loading CSV data:", error);
  });
}