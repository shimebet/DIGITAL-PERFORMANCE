
$ErrorActionPreference = 'Stop'

$file = 'D:\DIGITAL-PERFORMANCE\apps\api\src\modules\follow-ups\follow-ups.service.ts'

$content = [System.IO.File]::ReadAllText($file)

$oldEnable = @'
      const updated = await tx.followUp.update({
        where: { id },
        data: {
          isEnabled: true,
          disabledAt: null,
          disabledByUserId: null,
        },
      });
'@

$newEnable = @'
      const result = await tx.followUp.updateMany({
        where: {
          id,
          deletedAt: null,
          isEnabled: false,
        },
        data: {
          isEnabled: true,
          disabledAt: null,
          disabledByUserId: null,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up state changed. Refresh and try again.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });
'@

$oldDisable = @'
      const updated = await tx.followUp.update({
        where: { id },
        data: {
          isEnabled: false,
          disabledAt: new Date(),
          disabledByUserId: user.id,
        },
      });
'@

$newDisable = @'
      const result = await tx.followUp.updateMany({
        where: {
          id,
          deletedAt: null,
          isEnabled: true,
        },
        data: {
          isEnabled: false,
          disabledAt: new Date(),
          disabledByUserId: user.id,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up state changed. Refresh and try again.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });
'@

$oldDelete = @'
      const updated = await tx.followUp.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedByUserId: user.id,
        },
      });
'@

$newDelete = @'
      const result = await tx.followUp.updateMany({
        where: {
          id,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: user.id,
        },
      });

      if (result.count !== 1) {
        throw new BadRequestException(
          'Follow-up was already deleted or changed.',
        );
      }

      const updated = await tx.followUp.findUniqueOrThrow({
        where: { id },
      });
'@

$replacements = @(
  @($oldEnable, $newEnable),
  @($oldDisable, $newDisable),
  @($oldDelete, $newDelete)
)

foreach ($replacement in $replacements) {
  $old = $replacement[0]
  $new = $replacement[1]

  $matches = $content.Split(
    [string[]]@($old),
    [System.StringSplitOptions]::None
  ).Length - 1

  if ($matches -ne 1) {
    throw "Expected exactly one match, found $matches. No changes saved."
  }

  $content = $content.Replace($old, $new)
}

[System.IO.File]::WriteAllText(
  $file,
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host 'Atomic lifecycle transitions added.' -ForegroundColor Green
