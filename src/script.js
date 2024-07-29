const width = 1200;
const height = 600;
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
  document.getElementById("minYear").innerHTML = "";
  document.getElementById("maxYear").innerHTML = "";

  const selectedContent = chartContent.value;
  const min = selectedContent === "income" ? 2001 : 2010;
  const years = generateYearsList(min);

  // Populate minYear dropdown
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year.value;
    option.textContent = year.text;
    document.getElementById("minYear").appendChild(option);
  });
  years.forEach((year) => {
    const option = document.createElement("option");
    option.value = year.value;
    option.textContent = year.text;
    document.getElementById("maxYear").appendChild(option);
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
      } else if (key === "Products") {
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

// Event Listeners
const types = [];
const filterForm = document.querySelector("#typeFilter");
let minYear, maxYear;
filterForm.addEventListener("submit", (e) => {
  e.preventDefault();
  types.forEach((e) => types.pop());
  minYear = document.getElementById("minYear").value;
  maxYear = document.getElementById("maxYear").value;
  document.querySelectorAll('[type="checkbox"]').forEach((e) => {
    if (e.checked === true) {
      console.log(`submitted ${e.value}`);
      types.push(e.value);
    }
  });
  generateChart(document.getElementById("chartContent"), minYear, maxYear);
});
chartContent.addEventListener("change", updateYearOptions);

const dataType = document.querySelector("#dataFilter");
dataType.addEventListener("submit", (e) => {
  e.preventDefault();
});

function generateChart(e, minYear = 0, maxYear = 0) {
  var value = e.value;
  d3.selectAll("#chartInner").remove(); // Assuming you have an element with id 'chartInner' to remove the old chart
  switch (value) {
    case "all":
      //   console.log("showing all");
      return incomeAndSpendingChart(minYear, maxYear);
    case "income":
      //   console.log("showing income");
      return incomeChart(minYear, maxYear);
    case "spending":
      //   console.log("showing spending");
      return spendingChart(minYear, maxYear), productCostChart(); // Ensure both charts are rendered
    default:
      //   console.log("unknown");
      return;
  }
}

function spendingChart(minYear = 0, maxYear = 0) {
  //   d3.select("#dataShown").remove();
  d3.select("#chart")
    .append("div")
    .attr("name", "chartInner")
    .attr("id", "dataShown")
    .attr("class", "dataShown")
    .style("margin-top", "30px");

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

  // Create title
  svg
    .append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", 0 - margin.top / 6)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text("Average Expenditure per Household");

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
      const filteredYears = years.filter((year) => {
        const yearInt = parseInt(year);
        // console.log(yearInt);
        if (minYear != 0 && maxYear != 0) {
          return yearInt >= parseInt(minYear) && yearInt <= parseInt(maxYear);
        } else if (minYear != 0) {
          return yearInt >= parseInt(minYear);
        } else if (maxYear != 0) {
          return yearInt <= parseInt(maxYear);
        }
        return true; // If neither minYear nor maxYear is provided, include all years
      });
      //   console.log(filteredYears);

      const aggregatedData = filteredYears.map((year) => {
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
      const validData = aggregatedData.filter((d) => {
        return Object.keys(newCategories).every((key) => d[key] !== 0);
      });

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

function incomeChart(minYear = 0, maxYear = 0) {
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
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", 0 - margin.top / 6)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text("Median Income per Household");

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
      const filteredYears = years.filter((year) => {
        const yearInt = parseInt(year);
        // console.log(yearInt);
        if (minYear != 0 && maxYear != 0) {
          return yearInt >= parseInt(minYear) && yearInt <= parseInt(maxYear);
        } else if (minYear != 0) {
          return yearInt >= parseInt(minYear);
        } else if (maxYear != 0) {
          return yearInt <= parseInt(maxYear);
        }
        return true; // If neither minYear nor maxYear is provided, include all years
      });
      console.log(filteredYears);

      // Prepare data for line chart
      const series = categories.map((category) => ({
        name: category,
        values: filteredYears.map((year) => ({
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
        .domain(d3.extent(filteredYears, (d) => d))
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

function incomeAndSpendingChart(minYear = 0, maxYear = 0) {
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
      .filter((year) => {
        if (year >= 2010) {
          console.log(`${year}, ${minYear}, ${maxYear}`);
          if (minYear != 0 && maxYear != 0) {
            return year >= parseInt(minYear) && year <= parseInt(maxYear);
          } else if (minYear != 0) {
            return year >= parseInt(minYear);
          } else if (maxYear != 0) {
            return year <= parseInt(maxYear);
          } else {
            return true;
          }
        } else {
          return false;
        }
      });

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
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
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
    legend.append("text").attr("x", 0).attr("y", 10).text("Average Spending");

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

function productCostChart(minYear = 0, maxYear = 0) {
  //   spendingChart();
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

  d3.csv("./data/consumer_product_cost.csv")
    .then((data) => {
      const parsedData = parseDataByYear(data);
      //   console.log("Parsed data for products:", parsedData);

      const selectedProducts = [
        "Apples, 1 kilogram",
        "Chicken, 1 kilogram",
        "Ground beef, 1 kilogram",
        "Toothpaste, 100 millilitres",
        "Shampoo, 300 millilitres",

        "Eggs, 1 dozen",
        "Coffee, instant, 200 grams",
        "Bathroom tissue (4 rolls)",
      ];

      const allValues = selectedProducts.flatMap(
        (product) => parsedData[product]?.map((d) => d.averagePrice) || []
      );
      const maxPrice = d3.max(allValues);

      const x = d3
        .scaleTime()
        .domain([new Date(2000, 0, 1), new Date(2021, 0, 1)])
        .range([0, width - margin.left - margin.right]);

      const y = d3
        .scaleLinear()
        .domain([0, maxPrice])
        .nice()
        .range([height - margin.top - margin.bottom, 0]);

      const color = d3.scaleOrdinal(d3.schemeCategory10);

      const line = d3
        .line()
        .x((d) => x(new Date(d.year, 0, 1)))
        .y((d) => y(d.averagePrice));

      selectedProducts.forEach((product) => {
        const sanitizedProduct = sanitizeClassName(product);

        if (parsedData[product]) {
          svg
            .append("path")
            .datum(parsedData[product])
            .attr("fill", "none")
            .attr("stroke", color(product))
            .attr("stroke-width", 1.5)
            .attr("d", line);

          svg
            .selectAll(`.dot.${sanitizedProduct}`)
            .data(parsedData[product])
            .enter()
            .append("circle")
            .attr("class", `dot ${sanitizedProduct}`)
            .attr("cx", (d) => x(new Date(d.year, 0, 1)))
            .attr("cy", (d) => y(d.averagePrice))
            .attr("r", 3)
            .attr("fill", color(product));
        }
      });

      svg
        .append("g")
        .attr(
          "transform",
          `translate(0,${height - margin.top - margin.bottom})`
        )
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat("%Y")));

      svg.append("g").call(d3.axisLeft(y));

      svg
        .append("text")
        .attr(
          "transform",
          `translate(${(width - margin.left - margin.right) / 2},${
            height - margin.top - margin.bottom + 40
          })`
        )
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Year");

      // Y-axis label
      svg
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 20)
        .attr("x", 0 - (height - margin.top - margin.bottom) / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Average Price (in $)");

      const legend = svg
        .selectAll(".legend")
        .data(selectedProducts)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0,${i * 20})`);

      legend
        .append("rect")
        .attr("x", width - margin.right + 20)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", color);

      legend
        .append("text")
        .attr("x", width - margin.right + 40)
        .attr("y", 10)
        .attr("dy", "0.35em")
        .style("text-anchor", "start")
        .text((d) => d);
    })
    .catch((error) => {
      console.error("Error loading CSV data:", error);
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
  data.forEach((row) => {
    const productName = row["Products"];
    if (!yearlyData[productName]) {
      yearlyData[productName] = [];
    }

    // Loop through each year
    years.forEach((year) => {
      // Define the months
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      // Create the list of keys for the current year
      const yearColumns = months.map((month) => `${month} ${year}`);

      // Initialize the accumulator for the current year
      let yearTotal = 0;
      let count = 0;

      // Accumulate the total and count of valid entries for the current year
      yearColumns.forEach((col) => {
        if (col in row && !isNaN(row[col])) {
          yearTotal += parseFloat(row[col]);
          count++;
        }
      });

      // Calculate the average for the current year
      const yearAverage = count > 0 ? yearTotal / count : 0;

      // Add the average data to the yearlyData object for the current product
      yearlyData[productName].push({ year: year, averagePrice: yearAverage });
    });
  });

  return yearlyData;
}

// D3 CSV loading and parsing
d3.csv("./data/consumer_product_cost.csv")
  .then((data) => {
    // console.log("Raw data loaded:", data);

    const parsedData = parseDataByYear(data);
    // console.log("Parsed data for products:", parsedData);
  })
  .catch((error) => {
    console.error("Error loading CSV data:", error);
  });

function sanitizeClassName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}
