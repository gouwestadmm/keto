const Keto = () => {
  const [gender, setGender] = React.useState("");
  const [age, setAge] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [bodyfat, setBodyfat] = React.useState("");
  const [height, setHeight] = React.useState("");
  const [activityLevel, setActivityLevel] = React.useState("");
  const [netCarbs, setNetCarbs] = React.useState("");
  const [calorieAdjustment, setCalorieAdjustment] = React.useState("");

  // Create the form

  return (
    <TextField
      fieldId="age"
      title="Leeftijd"
      value={age}
      onChange={(e) => setAge(e.target.value)}
    />
  );
};
