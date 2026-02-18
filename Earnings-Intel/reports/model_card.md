# Model Card

## Data and split

- samples: 3633
- tabular feature count: 16
- text feature shape: (3633, 8000)
- split sizes: train=2543, val=544, test=546

## Classification baselines (test)

| model          |      auc |   auc_ci_low |   auc_ci_high |   accuracy |   accuracy_ci_low |   accuracy_ci_high |    brier |   brier_ci_low |   brier_ci_high |
|:---------------|---------:|-------------:|--------------:|-----------:|------------------:|-------------------:|---------:|---------------:|----------------:|
| logreg_tfidf   | 0.511092 |     0.468726 |      0.550978 |   0.492674 |          0.445055 |           0.531181 | 0.260192 |       0.251814 |        0.267641 |
| majority_class | 0.5      |     0.5      |      0.5      |   0.474359 |          0.433974 |           0.516484 | 0.525641 |       0.483516 |        0.566026 |
| logreg_tabular | 0.490119 |     0.438213 |      0.538107 |   0.467033 |          0.421245 |           0.505586 | 0.255612 |       0.250801 |        0.260567 |

## Regression baselines (test)

| model              |       mae |   mae_ci_low |   mae_ci_high |          r2 |   r2_ci_low |   r2_ci_high |    spearman |   spearman_ci_low |   spearman_ci_high |
|:-------------------|----------:|-------------:|--------------:|------------:|------------:|-------------:|------------:|------------------:|-------------------:|
| mean_regression    | 0.04662   |    0.0434104 |     0.049874  | -0.00207511 |  -0.0179535 | -4.99894e-06 | nan         |       nan         |         nan        |
| elasticnet_tabular | 0.04662   |    0.0434104 |     0.049874  | -0.00207511 |  -0.0179535 | -4.99894e-06 | nan         |       nan         |         nan        |
| ridge_tfidf        | 0.0476459 |    0.0442253 |     0.0509845 | -0.0342455  |  -0.0809983 |  0.0111589   |   0.0614065 |        -0.0272252 |           0.148525 |

## Notes

- Labels are event-study style abnormal returns and are not causal estimates.
- Time split is chronological to reduce leakage.
- Confidence intervals use bootstrap on the test split.
