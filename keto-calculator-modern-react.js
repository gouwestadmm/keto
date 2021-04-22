const {
  colors,
  CssBaseline,
  ThemeProvider,
  Typography,
  Container,
  makeStyles,
  createMuiTheme,
  Box,
  SvgIcon,
  Link,
  Input,
  FormControl,
  Radio,
  RadioGroup,
  FormLabel,
  TextField,
  Table,
  TableBody,
  TableContainer,
  TableRow,
  TableHead,
  Tablecell,
  Grid,
  Slider,
} = MaterialUI;

// Create a theme instance.
const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#ff8038",
    },
    secondary: {
      main: "#ff8038",
    },
    error: {
      main: colors.red.A400,
    },
    background: {
      default: "#fff",
    },
  },
});

// Keto

var Gender = {
  FEMALE: 0,
  MALE: 1,
};

var Warnings = {
  //
  // Essential bodyfat is too low
  //
  LOW_BODYFAT: 1 << 0,

  //
  // Fat intake (in grams) required to meet desirable level is too low (less then 30g)
  //
  LOW_FATGRAMS: 1 << 1,

  //
  // Calories required to meet desirable level are way too low (less than 1200 kcal)
  //
  LOW_CALORIES: 1 << 2,

  //
  // Net Carbs limit set too high making it impossible to meet desirable targets
  //
  HIGH_CARBS: 1 << 3,
};

class KetoDietBuddy {
  //
  // Construct the KetoDietBuddy calculator
  //
  // params *must* include:
  //    gender (see Gender)
  //    age (in years, can be float)
  //    weight (in kilos)
  //    height (in cm)
  //    activityLevel (0 - 1, float)
  //    bodyFat (0 - 100, percentage)
  //    netCarbs (net carbs limit in grams)
  //
  // see index.jsx for an example on how to use this class
  //
  constructor(params) {
    function getSafe(value, min, max) {
      return Math.min(Math.max(min, value), max);
    }

    //
    // Enforce some sensible ranges
    //
    this.gender = params.gender;
    this.age = getSafe(params.age, 0, 150);
    this.weight = getSafe(params.weight, 0, 350);
    this.height = getSafe(params.height, 0, 250);
    this.activityLevel = getSafe(params.activityLevel, 0, 1);
    this.bodyfat = getSafe(params.bodyfat, 0, 100);
    this.netCarbs = getSafe(params.netCarbs, 0, 1000);

    //
    // calculate Basal BMR, see http://ketodietapp.com/Blog/page/KetoDiet-Buddy for more info
    //
    switch (this.gender) {
      default:
      case Gender.FEMALE:
        //
        // female: 9.99 x weight (kg) + 6.25 x height (cm) - 4.92 x age (y) - 161
        //
        this.bmr =
          9.99 * this.weight + 6.25 * this.height - 4.92 * this.age - 161;
        break;
      case Gender.MALE:
        //
        // male:    9.99 x weight (kg) + 6.25 x height (cm) - 4.92 x age (y) + 5
        //
        this.bmr =
          9.99 * this.weight + 6.25 * this.height - 4.92 * this.age + 5;
        break;
    }

    //
    // Calculate Protein Level for given activity level
    //
    var activityProteinMin = 1.3;
    var activityProteinMax = 2.2;
    var activityProteinFactor =
      activityProteinMin +
      (activityProteinMax - activityProteinMin) * this.activityLevel;
    var leanMass = ((100 - this.bodyfat) * this.weight) / 100;
    this.longTermProteinIntake = leanMass * activityProteinFactor;

    //
    // Calculate calorie intake for maintenance level
    // Note: Using polynomial curve fitting function
    //
    var activityBmrFactor =
      1.0999999999999945 +
      -2.3333333333231288e-1 * this.activityLevel +
      3.7999999999943399 * Math.pow(this.activityLevel, 2) +
      -5.8666666666573466 * Math.pow(this.activityLevel, 3) +
      3.199999999995319 * Math.pow(this.activityLevel, 4);

    this.maintenanceCalorieIntake = this.bmr * activityBmrFactor * 1.1;

    //
    // Calculate essential and non-essential bodyfat
    //
    switch (this.gender) {
      default:
      case Gender.FEMALE:
        //
        // Source: wikipedia: 8% - 12%
        //
        this.essentialBodyFat = 8;
        break;
      case Gender.MALE:
        //
        // wikipedia: 3% - 5%
        //
        this.essentialBodyFat = 3;
        break;
    }

    this.nonEssentialBodyFat = this.bodyfat - this.essentialBodyFat;
    if (this.nonEssentialBodyFat < 0) {
      this.nonEssentialBodyFat = 0;
      this.bodyFatTooLow = true;
    } else {
      this.bodyFatTooLow = false;
    }

    return this;
  }

  //
  // Helper functions
  //

  //
  // Calculate calories based on fat, protein & carbs
  //
  static calculateCalorieIntakeFromMacronutrients(
    fatGrams,
    proteinInGrams,
    netCarbsInGrams
  ) {
    return fatGrams * 9 + proteinInGrams * 4 + netCarbsInGrams * 4;
  }

  //
  // Calculate fat intake in grams to meet calorie requirements for a given protein and carbs intake
  //
  static calculateFatIntakeInGrams(
    calorieIntake,
    proteinInGrams,
    netCarbsInGrams
  ) {
    var proteinKCals = proteinInGrams * 4;
    var carbsKCals = netCarbsInGrams * 4;
    var fatKCals = calorieIntake - (proteinKCals + carbsKCals);
    var fatGrams = fatKCals / 9;
    return fatGrams;
  }

  //
  // Calculate macronutrient ratios in grams, calories and percentages based on fat, protein & carbs
  //
  static calculateMacronutrientRatio(fatGrams, proteinGrams, netCarbGrams) {
    function roundMacroGrams(floatValue) {
      return parseFloat(floatValue.toFixed(1));
    }

    function roundMacroPerc(floatValue) {
      return parseFloat(floatValue.toFixed(0));
    }

    function roundMacroEnergy(floatValue) {
      return parseFloat(floatValue.toFixed(0));
    }

    var kcalFat = fatGrams * 9;
    var kcalProtein = proteinGrams * 4;
    var kcalNetCarbs = netCarbGrams * 4;
    var kcalTotal = kcalNetCarbs + kcalProtein + kcalFat;

    if (kcalTotal <= 0) {
      return;
    }

    var result = {};
    result.energy = roundMacroEnergy(kcalTotal);
    result.gramsFat = roundMacroGrams(fatGrams);
    result.gramsProtein = roundMacroGrams(proteinGrams);
    result.gramsNetCarbs = roundMacroGrams(netCarbGrams);
    result.energyFat = roundMacroEnergy(kcalFat);
    result.energyProtein = roundMacroEnergy(kcalProtein);
    result.energyNetCarbs = roundMacroEnergy(kcalNetCarbs);
    result.percEnergyNetCarbs = roundMacroPerc(
      (100 * kcalNetCarbs) / kcalTotal
    );
    result.percEnergyProtein = roundMacroPerc((100 * kcalProtein) / kcalTotal);
    result.percEnergyFat = roundMacroPerc(
      100 - (result.percEnergyNetCarbs + result.percEnergyProtein)
    );
    return result;
  }

  //
  // Core functions
  //

  //
  // The main KetoDietBuddy function: calculate macronutrient ratios for maintenance, minimum & desirable
  // levels. The adjustment factor determines the desirable calorie deficit or surplus. A positive value of 5
  // will result in 5% calorie surplus for weight/ muscle gain where a negative -5% will result in a 5% calorie
  // deficit for weight/ fat loss
  //
  // The resulting data is a collection of macronutrient ratios as calculated by calculateMacronutrientRatio.
  //
  calculateCalorieIntake(adjustment) {
    var result = {};
    result.adjustment = adjustment;
    result.warnings = 0;

    if (this.bodyFatTooLow) {
      result.warnings |= Warnings.LOW_BODYFAT;
    } else if (minimumFoodIntake >= this.maintenanceCalorieIntake) {
      result.warnings |= Warnings.HIGH_CARBS;
    }

    var nonEssentialFatMass =
      ((this.bodyfat - this.essentialBodyFat) * this.weight) / 100;
    var maxFatInGrams = KetoDietBuddy.calculateFatIntakeInGrams(
      this.maintenanceCalorieIntake,
      this.longTermProteinIntake,
      this.netCarbs
    );
    if (maxFatInGrams < 0) {
      maxFatInGrams = 0;
      result.warnings |= Warnings.HIGH_CARBS;
    }

    var minimumFoodIntake =
      this.maintenanceCalorieIntake - 69.2 * Math.max(0, nonEssentialFatMass);
    var minFatInGrams = KetoDietBuddy.calculateFatIntakeInGrams(
      minimumFoodIntake,
      this.longTermProteinIntake,
      this.netCarbs
    );
    if (minFatInGrams < 30) {
      minFatInGrams = 30;
      minimumFoodIntake = KetoDietBuddy.calculateCalorieIntakeFromMacronutrients(
        minFatInGrams,
        this.longTermProteinIntake,
        this.netCarbs
      );
    }

    var desirableFoodIntake =
      this.maintenanceCalorieIntake +
      (adjustment * this.maintenanceCalorieIntake) / 100;
    var desirableFatInGrams = KetoDietBuddy.calculateFatIntakeInGrams(
      desirableFoodIntake,
      this.longTermProteinIntake,
      this.netCarbs
    );
    if (desirableFatInGrams < 0) {
      desirableFatInGrams = 0;
      result.warnings |= Warnings.HIGH_CARBS;
    }

    result.maintenance = KetoDietBuddy.calculateMacronutrientRatio(
      maxFatInGrams,
      this.longTermProteinIntake,
      this.netCarbs
    );
    result.minimum = KetoDietBuddy.calculateMacronutrientRatio(
      minFatInGrams,
      this.longTermProteinIntake,
      this.netCarbs
    );
    result.desirable = KetoDietBuddy.calculateMacronutrientRatio(
      desirableFatInGrams,
      this.longTermProteinIntake,
      this.netCarbs
    );

    if (result.desirable.gramsFat < 30) {
      result.warnings |= Warnings.LOW_FATGRAMS;
    }
    if (desirableFoodIntake < 1200) {
      result.warnings |= Warnings.LOW_CALORIES;
    }

    return result;
  }
}

//
// Exports
//

const Keto = () => {
  const [gender, setGender] = React.useState("");
  const [age, setAge] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [bodyfat, setBodyfat] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [activityLevel, setActivityLevel] = React.useState("");
  const [netCarbs, setNetCarbs] = React.useState("");
  const [calorieAdjustment, setCalorieAdjustment] = React.useState("");
};

class App extends React.Component {
  state = {
    params: {
      gender: Gender.FEMALE,
      age: 35,
      weight: 66,
      bodyfat: 26,
      height: 160,
      activityLevel: 0,
      netCarbs: 30,
    },
    others: {
      calorieAdjustment: -10,
    },
  };

  // Set UseStates

  updateParams(newValue) {
    this.setState({ params: newValue });
  }

  updateOthers(newValue) {
    this.setState({ others: newValue });
  }

  render() {
    var exampleData = {
      gender: Gender.FEMALE,
      age: 35,
      weight: 85,
      bodyfat: 30,
      height: 160,
      activityLevel: 0,
      netCarbs: 30,
    };

    var calorieAdjustment = -15;

    var kdb = new KetoDietBuddy(exampleData);
    var typicalResult = kdb.calculateCalorieIntake(calorieAdjustment);

    return (
      <div>
        <InputForm
          params={this.state.params}
          others={this.state.others}
          updateParams={this.updateParams.bind(this)}
          updateOthers={this.updateOthers.bind(this)}
        />
        <h3>Resultaten</h3>
        <Results params={this.state.params} others={this.state.others} />
      </div>
    );
  }
}

class InputForm extends React.Component {
  updateGender(newValue) {
    this.props.params.gender =
      newValue === Gender.MALE ? Gender.MALE : Gender.FEMALE;
    this.props.updateParams(this.props.params);
  }
  updateAge(newValue) {
    this.props.params.age = newValue;
    this.props.updateParams(this.props.params);
  }
  updateWeight(newValue) {
    this.props.params.weight = newValue;
    this.props.updateParams(this.props.params);
  }
  updateHeight(newValue) {
    this.props.params.height = newValue;
    this.props.updateParams(this.props.params);
  }
  updateActivityLevel(newValue) {
    this.props.params.activityLevel = newValue;
    this.props.updateParams(this.props.params);
  }
  updateBodyfat(newValue) {
    this.props.params.bodyfat = newValue;
    this.props.updateParams(this.props.params);
  }
  updateNetCarbs(newValue) {
    this.props.params.netCarbs = newValue;
    this.props.updateParams(this.props.params);
  }
  updateCalorieAdjustment(newValue) {
    this.props.others.calorieAdjustment = newValue;
    this.props.updateOthers(this.props.others);
  }

  render() {
    return (
      <form>
        <InputFormGenderField
          fieldId="gender"
          value={this.props.params.gender}
          updateValue={this.updateGender.bind(this)}
        />
        <InputFormNumberField
          fieldId="age"
          title="Leeftijd"
          value={this.props.params.age}
          updateValue={this.updateAge.bind(this)}
        />
        <InputFormNumberField
          fieldId="weight"
          title="Gewicht (Kg)"
          helper="Vul je gewicht in kilogram in"
          value={this.props.params.weight}
          updateValue={this.updateWeight.bind(this)}
        />
        <InputFormNumberField
          fieldId="bodyfat"
          title="Vetpercentage (%)"
          value={this.props.params.bodyfat}
          updateValue={this.updateBodyfat.bind(this)}
        />
        <InputFormNumberField
          fieldId="height"
          title="Lengte (cm)"
          value={this.props.params.height}
          updateValue={this.updateHeight.bind(this)}
        />
        <InputFormNumberField
          fieldId="activityLevel"
          title="Hoe actief ben je (0 - 1)"
          value={this.props.params.activityLevel}
          updateValue={this.updateActivityLevel.bind(this)}
        />
        <InputSlider
          value={this.props.params.activityLevel}
          updateValue={this.updateActivityLevel.bind(this)}
        ></InputSlider>
        <InputFormNumberField
          fieldId="netCarbs"
          title="Netto Koolhydraten(g)"
          value={this.props.params.netCarbs}
          updateValue={this.updateNetCarbs.bind(this)}
        />

        <InputFormNumberField
          fieldId="calorieAdjustment"
          title="Calorie Adjustment (%)"
          value={this.props.others.calorieAdjustment}
          updateValue={this.updateCalorieAdjustment.bind(this)}
        />
      </form>
    );
  }
}

class InputFormGenderField extends React.Component {
  update(event) {
    try {
      var newValue = parseInt(event.target.value);
      this.props.updateValue(newValue);
    } catch (ex) {
      console.error(ex);
    }
  }

  render() {
    var idFemale = this.props.fieldId + "_female";
    var idMale = this.props.fieldId + "_male";

    return (
      <div>
        <Radio
          type="radio"
          name={idFemale}
          value={Gender.FEMALE}
          checked={this.props.value === Gender.FEMALE}
          onChange={this.update.bind(this)}
          label="Vrouw"
        />
        <label for={idFemale}>Vrouw</label>

        <Radio
          type="radio"
          name={idMale}
          value={Gender.MALE}
          checked={this.props.value === Gender.MALE}
          onChange={this.update.bind(this)}
        />
        <label for={idMale}>Man</label>
      </div>
    );
  }
}

const InputSlider = (props) => {
  function toNumber(value) {
    return isNaN(value) || value === undefined ? 0 : value;
  }

  return (
    <Grid container spacing={2}>
      <Grid item>
        <p>1</p>
      </Grid>
      <Grid item xs>
        <Slider
          min={0}
          max={1}
          steps={0.1}
          defaultValue={0}
          name={props.fieldId}
          value={toNumber(props.value)}
          aria-labelledby="continuous-slider"
        />
      </Grid>
      <Grid item>
        <p>10</p>
      </Grid>
    </Grid>
  );
};

class InputFormNumberField extends React.Component {
  update(event) {
    try {
      var newValue = parseFloat(event.target.value);
      this.props.updateValue(newValue);
    } catch (ex) {
      console.error(ex);
    }
  }

  toNumber(value) {
    return isNaN(value) || value === undefined ? 0 : value;
  }

  render() {
    return (
      <div>
        <label for={this.props.fieldId}>{this.props.title}</label>
        <TextField
          type="text"
          variant="outlined"
          name={this.props.fieldId}
          label={this.props.title}
          helperText={this.props.helper}
          value={this.toNumber(this.props.value)}
          onChange={this.update.bind(this)}
        />
      </div>
    );
  }
}

class Results extends React.Component {
  render() {
    try {
      var kdb = new KetoDietBuddy(this.props.params);
      var result = kdb.calculateCalorieIntake(
        this.props.others.calorieAdjustment
      );
      var textResult = JSON.stringify(result, null, 4);

      var calorieAdjustment =
        result.adjustment < 0
          ? -result.adjustment + "% deficit"
          : result.adjustment + "% surplus";
      var warnings = "";
      if ((result.warnings & Warnings.LOW_BODYFAT) == Warnings.LOW_BODYFAT) {
        warnings += "Vetpercentage te laag, ";
      }
      if ((result.warnings & Warnings.LOW_CALORIES) == Warnings.LOW_CALORIES) {
        warnings += "Calorie inname te laag, ";
      }
      if ((result.warnings & Warnings.LOW_FATGRAMS) == Warnings.LOW_FATGRAMS) {
        warnings += "Vet inname te laag, ";
      }
      if ((result.warnings & Warnings.HIGH_CARBS) == Warnings.HIGH_CARBS) {
        warnings += "Koolhydraatinname te hoog, ";
      }
      if (warnings.length == 0) {
        warnings = "Geen fouten -- helemaal goed";
      }

      return (
        <div>
          <table>
            <tbody>
              <ResultsSectionItem
                name="Calorie Desirable Adjustment"
                value={calorieAdjustment}
              />
              <ResultsSectionItem name="Warnings" value={warnings} />
            </tbody>
          </table>
          <h4>
            Calculated Basal Metabolic Rate (BMR): {Math.round(kdb.bmr)} kcal
          </h4>
          <h4>Minimum</h4>
          <ResultsSection result={result.minimum} />
          <h4>Maintenance</h4>
          <ResultsSection result={result.maintenance} />
          <h4>Desirable</h4>
          <ResultsSection result={result.desirable} />
        </div>
      );
    } catch (ex) {
      return (
        <div>
          <textarea readOnly cols="64" rows="42" value={ex} />
        </div>
      );
    }
  }
}

class ResultsSection extends React.Component {
  render() {
    var energy = this.props.result.energy + " kcal";
    var macroGrams =
      this.props.result.gramsFat +
      "g, " +
      this.props.result.gramsProtein +
      "g, " +
      this.props.result.gramsNetCarbs +
      "g";
    var macroEnergy =
      this.props.result.energyFat +
      " kcal, " +
      this.props.result.energyProtein +
      " kcal, " +
      this.props.result.energyNetCarbs +
      " kcal";
    var macroPercEnergy =
      this.props.result.percEnergyFat +
      "%, " +
      this.props.result.percEnergyProtein +
      "%, " +
      this.props.result.percEnergyNetCarbs +
      "%";

    return (
      <Table>
        <TableBody>
          <ResultsSectionItem name="Energy" value={energy} />
          <ResultsSectionItem
            name="Fat/ Protein/ Net Carbs grams"
            value={macroGrams}
          />
          <ResultsSectionItem
            name="Fat/ Protein/ Net Carbs energy"
            value={macroEnergy}
          />
          <ResultsSectionItem
            name="Fat/ Protein/ Net Carbs %"
            value={macroPercEnergy}
          />
        </TableBody>
      </Table>
    );
  }
}

class ResultsSectionItem extends React.Component {
  render() {
    return (
      <tr>
        <td>{this.props.name}</td>
        <td>{this.props.value}</td>
      </tr>
    );
  }
}

ReactDOM.render(
  <ThemeProvider theme={theme}>
    {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
    <CssBaseline />
    <App />
  </ThemeProvider>,
  document.querySelector("#keto-calculator")
);
