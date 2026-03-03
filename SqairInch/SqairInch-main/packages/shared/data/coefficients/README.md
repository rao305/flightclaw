# Coefficient JSON format (V0.1)

One file per `(gender, bodyShape)`, named `{gender}_{bodyShape}.json` (e.g. `M_rectangle.json`, `F_hourglass.json`).

## File shape

```json
{
  "zones": {
    "<zone_key>": {
      "intercept": number,
      "heightCm": number (optional, default 0),
      "weightKg": number (optional, default 0),
      "bmi": number (optional, default 0),
      "age": number (optional, default 0),
      "minCm": number,
      "maxCm": number
    }
  }
}
```

Zone keys must be canonical: `shoulders`, `bust_chest`, `waist`, `hips`, `thigh`, `inseam`, `sleeve_length`, `torso_length`.

Predicted value per zone: `raw = intercept + heightCm*H + weightKg*W + bmi*BMI + age*A`, then clamped to `[minCm, maxCm]`.
