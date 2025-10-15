<#
.SYNOPSIS
    SupaDupaCode Workflow Checkpoint Runner
    Manages workflow checkpoints and provides automation for checkpoint operations

.DESCRIPTION
    This PowerShell script provides automation capabilities for managing workflow checkpoints
    in the SupaDupaCode CLI system. It can create, restore, list, and cleanup checkpoints,
    as well as monitor workflow execution status.

.PARAMETER Action
    The action to perform. Valid values are:
    - Create: Create a new checkpoint
    - Restore: Restore from an existing checkpoint
    - List: List available checkpoints
    - Cleanup: Cleanup old checkpoints
    - Status: Show workflow status
    - Monitor: Monitor workflow execution

.PARAMETER CheckpointId
    The ID of the checkpoint to restore (required for Restore action)

.PARAMETER WorkflowId
    The ID of the workflow (optional, defaults to latest workflow)

.PARAMETER DataPath
    Path to the data directory containing checkpoints (default: ./data/checkpoints)

.PARAMETER ConfigPath
    Path to the configuration file (default: ./config/supadupacode.json)

.PARAMETER Force
    Force operation without confirmation

.PARAMETER Verbose
    Enable verbose output

.EXAMPLE
    .\run-checkpoint.ps1 -Action List
    Lists all available checkpoints

.EXAMPLE
    .\run-checkpoint.ps1 -Action Restore -CheckpointId "checkpoint_1697123422000_a1b2c3d4"
    Restores workflow from specified checkpoint

.EXAMPLE
    .\run-checkpoint.ps1 -Action Create -WorkflowId "workflow_1234567890_abcdef12"
    Creates a new checkpoint for the specified workflow

.EXAMPLE
    .\run-checkpoint.ps1 -Action Cleanup -Force
    Cleanup old checkpoints without confirmation

.NOTES
    Author: SupaDupaCode Workflow System
    Version: 1.0.0
    Requires: PowerShell 5.1 or later
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Create", "Restore", "List", "Cleanup", "Status", "Monitor")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$CheckpointId,

    [Parameter(Mandatory=$false)]
    [string]$WorkflowId,

    [Parameter(Mandatory=$false)]
    [string]$DataPath = "./data/checkpoints",

    [Parameter(Mandatory=$false)]
    [string]$ConfigPath = "./config/supadupacode.json",

    [Parameter(Mandatory=$false)]
    [switch]$Force,

    [Parameter(Mandatory=$false)]
    [switch]$Verbose
)

# Import required modules
try {
    Import-Module -Name "Microsoft.PowerShell.Utility" -ErrorAction Stop
} catch {
    Write-Error "Failed to import required PowerShell modules"
    exit 1
}

# Global variables
$script:ErrorActionPreference = "Stop"
$script:ProgressPreference = "Continue"

# Logging functions
function Write-Log {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Level) {
        "Info" { "White" }
        "Warning" { "Yellow" }
        "Error" { "Red" }
        "Success" { "Green" }
    }
    
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $color
}

function Write-VerboseLog {
    param([string]$Message)
    if ($Verbose) {
        Write-Log -Message $Message -Level "Info"
    }
}

# Configuration functions
function Get-Configuration {
    try {
        if (Test-Path $ConfigPath) {
            $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
            Write-VerboseLog "Configuration loaded from $ConfigPath"
            return $config
        } else {
            Write-Log -Message "Configuration file not found at $ConfigPath, using defaults" -Level "Warning"
            return @{
                workflow = @{
                    checkpointPath = $DataPath
                    maxCheckpoints = 100
                    retentionDays = 30
                }
            }
        }
    } catch {
        Write-Log -Message "Failed to load configuration: $($_.Exception.Message)" -Level "Error"
        throw
    }
}

# Checkpoint functions
function Get-CheckpointList {
    param([string]$Path)
    
    try {
        if (-not (Test-Path $Path)) {
            Write-VerboseLog "Checkpoint directory does not exist: $Path"
            return @()
        }
        
        $checkpoints = Get-ChildItem -Path $Path -Filter "*.json" | Sort-Object LastWriteTime -Descending
        
        $checkpointList = @()
        foreach ($file in $checkpoints) {
            try {
                $content = Get-Content $file.FullName -Raw | ConvertFrom-Json
                $checkpointInfo = [PSCustomObject]@{
                    Id = $file.BaseName
                    WorkflowId = $content.workflowId
                    StepId = $content.stepId
                    Timestamp = $content.timestamp
                    Size = $file.Length
                    Path = $file.FullName
                }
                $checkpointList += $checkpointInfo
            } catch {
                Write-Log -Message "Failed to parse checkpoint file $($file.Name): $($_.Exception.Message)" -Level "Warning"
            }
        }
        
        return $checkpointList
    } catch {
        Write-Log -Message "Failed to get checkpoint list: $($_.Exception.Message)" -Level "Error"
        throw
    }
}

function New-Checkpoint {
    param(
        [string]$WorkflowId,
        [string]$DataPath
    )
    
    try {
        Write-Log -Message "Creating checkpoint for workflow: $WorkflowId" -Level "Info"
        
        # Generate checkpoint ID
        $checkpointId = "checkpoint_$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random -Maximum 9999 -Minimum 1000)"
        $checkpointPath = Join-Path $DataPath "$checkpointId.json"
        
        # Ensure directory exists
        New-Item -ItemType Directory -Path $DataPath -Force | Out-Null
        
        # Get current workflow state (this would integrate with the actual workflow system)
        $workflowState = @{
            checkpointId = $checkpointId
            workflowId = $WorkflowId
            stepId = "current_step"
            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            state = @{
                currentStepIndex = 0
                completedSteps = @()
                pendingSteps = @()
                artifacts = @()
                context = @{}
                variables = @{}
            }
            metadata = @{
                agentId = "powershell-script"
                duration = 0
                memoryUsage = 0
                diskUsage = 0
                retryCount = 0
            }
        }
        
        # Save checkpoint
        $workflowState | ConvertTo-Json -Depth 10 | Out-File -FilePath $checkpointPath -Encoding UTF8
        
        Write-Log -Message "Checkpoint created successfully: $checkpointId" -Level "Success"
        Write-Log -Message "Checkpoint saved to: $checkpointPath" -Level "Info"
        
        return $checkpointId
    } catch {
        Write-Log -Message "Failed to create checkpoint: $($_.Exception.Message)" -Level "Error"
        throw
    }
}

function Restore-Checkpoint {
    param(
        [string]$CheckpointId,
        [string]$DataPath
    )
    
    try {
        $checkpointPath = Join-Path $DataPath "$CheckpointId.json"
        
        if (-not (Test-Path $checkpointPath)) {
            Write-Log -Message "Checkpoint not found: $CheckpointId" -Level "Error"
            throw "Checkpoint not found"
        }
        
        Write-Log -Message "Restoring checkpoint: $CheckpointId" -Level "Info"
        
        # Load checkpoint data
        $checkpointData = Get-Content $checkpointPath -Raw | ConvertFrom-Json
        
        # Restore workflow state (this would integrate with the actual workflow system)
        Write-Log -Message "Restoring workflow: $($checkpointData.workflowId)" -Level "Info"
        Write-Log -Message "Current step: $($checkpointData.stepId)" -Level "Info"
        Write-Log -Message "Checkpoint timestamp: $($checkpointData.timestamp)" -Level "Info"
        
        Write-Log -Message "Checkpoint restored successfully" -Level "Success"
        return $checkpointData
    } catch {
        Write-Log -Message "Failed to restore checkpoint: $($_.Exception.Message)" -Level "Error"
        throw
    }
}

function Remove-OldCheckpoints {
    param(
        [string]$DataPath,
        [int]$RetentionDays,
        [int]$MaxCheckpoints,
        [switch]$Force
    )
    
    try {
        Write-Log -Message "Cleaning up old checkpoints..." -Level "Info"
        
        $checkpoints = Get-CheckpointList -Path $DataPath
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $removedCount = 0
        
        # Remove checkpoints older than retention period
        foreach ($checkpoint in $checkpoints) {
            $checkpointDate = [DateTime]::Parse($checkpoint.Timestamp)
            
            if ($checkpointDate -lt $cutoffDate) {
                if ($Force -or $PSCmdlet.ShouldProcess($checkpoint.Id, "Remove old checkpoint")) {
                    Remove-Item -Path $checkpoint.Path -Force
                    Write-VerboseLog "Removed old checkpoint: $($checkpoint.Id)"
                    $removedCount++
                }
            }
        }
        
        # If still too many checkpoints, remove the oldest ones
        $remainingCheckpoints = Get-CheckpointList -Path $DataPath
        if ($remainingCheckpoints.Count -gt $MaxCheckpoints) {
            $toRemove = $remainingCheckpoints | Sort-Object Timestamp | Select-Object -First ($remainingCheckpoints.Count - $MaxCheckpoints)
            
            foreach ($checkpoint in $toRemove) {
                if ($Force -or $PSCmdlet.ShouldProcess($checkpoint.Id, "Remove excess checkpoint")) {
                    Remove-Item -Path $checkpoint.Path -Force
                    Write-VerboseLog "Removed excess checkpoint: $($checkpoint.Id)"
                    $removedCount++
                }
            }
        }
        
        Write-Log -Message "Cleanup completed. Removed $removedCount checkpoints." -Level "Success"
    } catch {
        Write-Log -Message "Failed to cleanup checkpoints: $($_.Exception.Message)" -Level "Error"
        throw
    }
}

function Get-WorkflowStatus {
    try {
        Write-Log -Message "Getting workflow status..." -Level "Info"
        
        # Check for active workflow processes
        $workflowProcesses = Get-Process | Where-Object { $_.ProcessName -like "*workflow*" -or $_.ProcessName -like "*supadupacode*" }
        
        if ($workflowProcesses) {
            Write-Log -Message "Active workflow processes found:" -Level "Info"
            foreach ($process in $workflowProcesses) {
                Write-Log -Message "  - $($process.ProcessName) (PID: $($process.Id), CPU: $($process.CPUTime))" -Level "Info"
            }
        } else {
            Write-Log -Message "No active workflow processes found" -Level "Info"
        }
        
        # Check recent checkpoints
        $checkpoints = Get-CheckpointList -Path $DataPath
        if ($checkpoints) {
            Write-Log -Message "Recent checkpoints:" -Level "Info"
            foreach ($checkpoint in $checkpoints | Select-Object -First 5) {
                $timeAgo = (Get-Date) - [DateTime]::Parse($checkpoint.Timestamp)
                Write-Log -Message "  - $($checkpoint.Id) ($($timeAgo.Hours)h $($timeAgo.Minutes)m ago)" -Level "Info"
            }
        } else {
            Write-Log -Message "No checkpoints found" -Level "Warning"
        }
        
        # Check disk space
        $drive = Get-PSDrive -Name (Get-Location).Drive.Name
        $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
        Write-Log -Message "Available disk space: $freeSpaceGB GB" -Level "Info"
        
    } catch {
        Write-Log -Message "Failed to get workflow status: $($_.Exception.Message)" -Level "Error"
        throw
    }
}

function Start-Monitor {
    try {
        Write-Log -Message "Starting workflow monitoring..." -Level "Info"
        Write-Log -Message "Press Ctrl+C to stop monitoring" -Level "Info"
        
        while ($true) {
            Clear-Host
            Write-Log -Message "=== SupaDupaCode Workflow Monitor ===" -Level "Info"
            Write-Log -Message "Last updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -Level "Info"
            Write-Host ""
            
            Get-WorkflowStatus
            
            Write-Host ""
            Write-Log -Message "Next update in 30 seconds..." -Level "Info"
            
            Start-Sleep -Seconds 30
        }
    } catch {
        Write-Log -Message "Monitoring stopped: $($_.Exception.Message)" -Level "Warning"
    }
}

# Main execution
try {
    Write-Log -Message "SupaDupaCode Workflow Checkpoint Runner v1.0.0" -Level "Success"
    Write-Log -Message "Action: $Action" -Level "Info"
    
    # Load configuration
    $config = Get-Configuration
    $checkpointPath = $config.workflow.checkpointPath
    
    # Ensure checkpoint directory exists
    if (-not (Test-Path $checkpointPath)) {
        New-Item -ItemType Directory -Path $checkpointPath -Force | Out-Null
        Write-VerboseLog "Created checkpoint directory: $checkpointPath"
    }
    
    # Execute action
    switch ($Action) {
        "Create" {
            $workflowIdToUse = $WorkflowId
            if (-not $workflowIdToUse) {
                # Get latest workflow ID from checkpoints
                $checkpoints = Get-CheckpointList -Path $checkpointPath
                if ($checkpoints) {
                    $workflowIdToUse = $checkpoints[0].WorkflowId
                    Write-Log -Message "Using latest workflow ID: $workflowIdToUse" -Level "Info"
                } else {
                    $workflowIdToUse = "workflow_$(Get-Date -Format 'yyyyMMddHHmmss')_$(Get-Random -Maximum 9999 -Minimum 1000)"
                    Write-Log -Message "Generated new workflow ID: $workflowIdToUse" -Level "Info"
                }
            }
            
            $checkpointId = New-Checkpoint -WorkflowId $workflowIdToUse -DataPath $checkpointPath
            Write-Log -Message "Checkpoint created with ID: $checkpointId" -Level "Success"
        }
        
        "Restore" {
            if (-not $CheckpointId) {
                Write-Log -Message "CheckpointId is required for Restore action" -Level "Error"
                exit 1
            }
            
            $checkpointData = Restore-Checkpoint -CheckpointId $CheckpointId -DataPath $checkpointPath
            Write-Log -Message "Workflow restored to checkpoint: $($checkpointData.workflowId)" -Level "Success"
        }
        
        "List" {
            $checkpoints = Get-CheckpointList -Path $checkpointPath
            if ($checkpoints) {
                Write-Log -Message "Found $($checkpoints.Count) checkpoints:" -Level "Info"
                Write-Host ""
                Write-Host "ID                                    Workflow ID                        Step ID         Timestamp                    Size"
                Write-Host "----                                   ----------                        -------         ---------                    ----"
                
                foreach ($checkpoint in $checkpoints) {
                    $sizeKB = [math]::Round($checkpoint.Size / 1KB, 2)
                    Write-Host "$($checkpoint.Id.PadRight(38)) $($checkpoint.WorkflowId.PadRight(34)) $($checkpoint.StepId.PadRight(15)) $($checkpoint.Timestamp.PadRight(28)) $($sizeKB)KB"
                }
            } else {
                Write-Log -Message "No checkpoints found" -Level "Warning"
            }
        }
        
        "Cleanup" {
            $retentionDays = $config.workflow.retentionDays
            $maxCheckpoints = $config.workflow.maxCheckpoints
            
            Write-Log -Message "Cleanup settings:" -Level "Info"
            Write-Log -Message "  Retention days: $retentionDays" -Level "Info"
            Write-Log -Message "  Max checkpoints: $maxCheckpoints" -Level "Info"
            Write-Host ""
            
            Remove-OldCheckpoints -DataPath $checkpointPath -RetentionDays $retentionDays -MaxCheckpoints $maxCheckpoints -Force:$Force
        }
        
        "Status" {
            Get-WorkflowStatus
        }
        
        "Monitor" {
            Start-Monitor
        }
    }
    
    Write-Log -Message "Action completed successfully" -Level "Success"
} catch {
    Write-Log -Message "Script failed: $($_.Exception.Message)" -Level "Error"
    exit 1
}